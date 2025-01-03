import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { OrderStatus } from "@prisma/client";
import { InfoSimplesCorreiosMockClient } from "~/app/api/repositories/InfoSimplesMockClient";

const correiosClient = new InfoSimplesCorreiosMockClient({ token: "" });

const trackingCodeSchema = z.object({
  trackingCode: z.string().trim().min(1),
});

const updateTrackingSchema = z.object({
  orderId: z.string(),
  trackingCode: z.string().trim().min(1),
});

export const trackingRouter = createTRPCRouter({
  getStatus: protectedProcedure
    .input(trackingCodeSchema)
    .query(async ({ input }) => {
      try {
        const trackingInfo = await correiosClient.trackPackage(
          input.trackingCode,
        );

        if (trackingInfo.code !== 200 || trackingInfo.data_count === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tracking code not found or invalid",
          });
        }

        return {
          exists: true,
          status: trackingInfo.data[0]?.situacao ?? "Unknown",
          lastUpdate: trackingInfo.data[0]?.normalizado_datahora,
          history: trackingInfo.data[0]?.historico ?? [],
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tracking information",
          cause: error,
        });
      }
    }),

  updateTracking: protectedProcedure
    .input(updateTrackingSchema)
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          orderImport: {
            userId: ctx.session.user.id,
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found.",
        });
      }

      try {
        const trackingInfo = await correiosClient.trackPackage(
          input.trackingCode,
        );

        // Handle successful tracking
        if (trackingInfo.code === 200 && trackingInfo.data_count > 0) {
          // Determine status based on tracking response
          const situacao = trackingInfo.data[0]?.situacao?.toLowerCase() ?? "";
          let newStatus: OrderStatus;

          if (situacao.includes("entregue")) {
            newStatus = OrderStatus.DELIVERED;
          } else if (
            situacao.includes("trânsito") ||
            situacao.includes("transito")
          ) {
            newStatus = OrderStatus.IN_TRANSIT;
          } else {
            newStatus = OrderStatus.POSTED;
          }

          const updatedOrder = await ctx.db.order.update({
            where: { id: input.orderId },
            data: {
              trackingCode: input.trackingCode,
              shippingStatus: newStatus,
            },
          });

          return {
            success: true,
            order: updatedOrder,
            trackingInfo: {
              status: trackingInfo.data[0]?.situacao,
              lastUpdate: trackingInfo.data[0]?.normalizado_datahora,
              history: trackingInfo.data[0]?.historico,
            },
          };
        }

        // Handle not found tracking
        if (trackingInfo.code !== 200 || trackingInfo.data_count === 0) {
          const updatedOrder = await ctx.db.order.update({
            where: { id: input.orderId },
            data: {
              shippingStatus: OrderStatus.NOT_FOUND,
            },
          });

          return {
            success: true,
            order: updatedOrder,
            trackingInfo: {
              status: "Not Found",
              lastUpdate: null,
              history: [],
            },
          };
        }

        // Fallback case (shouldn't normally occur)
        return {
          success: true,
          order,
          trackingInfo: {
            status: "Unknown",
            lastUpdate: null,
            history: [],
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update tracking information.",
          cause: error,
        });
      }
    }),

  verifyTrackingCode: protectedProcedure
    .input(trackingCodeSchema)
    .query(async ({ input }) => {
      try {
        const exists = await correiosClient.trackingCodeExists(
          input.trackingCode,
        );
        return { exists };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify tracking code",
          cause: error,
        });
      }
    }),

  batchUpdateTracking: protectedProcedure
    .input(
      z.object({
        orderIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orders = await ctx.db.order.findMany({
        where: {
          id: { in: input.orderIds },
          trackingCode: { not: null },
          orderImport: {
            userId: ctx.session.user.id,
          },
        },
      });

      const updates = await Promise.allSettled(
        orders.map(async (order) => {
          if (!order.trackingCode) return null;

          try {
            const trackingInfo = await correiosClient.trackPackage(
              order.trackingCode,
            );

            if (trackingInfo.code === 200 && trackingInfo.data_count > 0) {
              // Determine status based on tracking response
              const situacao =
                trackingInfo.data[0]?.situacao?.toLowerCase() ?? "";
              let newStatus: OrderStatus;

              if (situacao.includes("entregue")) {
                newStatus = OrderStatus.DELIVERED;
              } else if (
                situacao.includes("trânsito") ||
                situacao.includes("transito")
              ) {
                newStatus = OrderStatus.IN_TRANSIT;
              } else {
                newStatus = OrderStatus.POSTED;
              }

              return ctx.db.order.update({
                where: { id: order.id },
                data: {
                  shippingStatus: newStatus,
                },
              });
            } else {
              return ctx.db.order.update({
                where: { id: order.id },
                data: {
                  shippingStatus: OrderStatus.NOT_FOUND,
                },
              });
            }
          } catch (error) {
            console.error(
              `Failed to update tracking for order ${order.id}:`,
              error,
            );
            return null;
          }
        }),
      );

      const successCount = updates.filter(
        (result) => result.status === "fulfilled" && result.value !== null,
      ).length;

      return {
        totalProcessed: orders.length,
        successfulUpdates: successCount,
      };
    }),

  batchUpdateAllOrders: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Get all orders with tracking codes for the current user
      const orders = await ctx.db.order.findMany({
        where: {
          trackingCode: { not: null },
          orderImport: {
            userId: ctx.session.user.id,
          },
        },
      });

      const updates = await Promise.allSettled(
        orders.map(async (order) => {
          if (!order.trackingCode) return null;

          try {
            const trackingInfo = await correiosClient.trackPackage(
              order.trackingCode,
            );

            if (trackingInfo.code === 200 && trackingInfo.data_count > 0) {
              const situacao =
                trackingInfo.data[0]?.situacao?.toLowerCase() ?? "";
              let newStatus: OrderStatus;

              if (situacao.includes("entregue")) {
                newStatus = OrderStatus.DELIVERED;
              } else if (
                situacao.includes("trânsito") ||
                situacao.includes("transito")
              ) {
                newStatus = OrderStatus.IN_TRANSIT;
              } else {
                newStatus = OrderStatus.POSTED;
              }

              return ctx.db.order.update({
                where: { id: order.id },
                data: {
                  shippingStatus: newStatus,
                },
              });
            } else {
              return ctx.db.order.update({
                where: { id: order.id },
                data: {
                  shippingStatus: OrderStatus.NOT_FOUND,
                },
              });
            }
          } catch (error) {
            console.error(
              `Failed to update tracking for order ${order.id}:`,
              error,
            );
            return null;
          }
        }),
      );

      const successCount = updates.filter(
        (result) => result.status === "fulfilled" && result.value !== null,
      ).length;

      return {
        totalProcessed: orders.length,
        successfulUpdates: successCount,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update orders",
        cause: error,
      });
    }
  }),
});
