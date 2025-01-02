import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
// import { InfoSimplesCorreiosClient } from "~/app/api/repositories/InfoSimplesCorreiosClient";
import { env } from "~/env";
import { InfoSimplesCorreiosMockClient } from "~/app/api/repositories/InfoSimplesMockClient";

// Initialize the client
// const correiosClient = new InfoSimplesCorreiosClient({
//   token: env.INFOSIMPLES_SECRET!,
// });

const correiosClient = new InfoSimplesCorreiosMockClient({
  token: env.INFOSIMPLES_SECRET!,
});

// Schemas for input validation
const trackingCodeSchema = z.object({
  trackingCode: z.string().trim().min(1),
});

const updateTrackingSchema = z.object({
  orderId: z.string(),
  trackingCode: z.string().trim().min(1),
});

export const trackingRouter = createTRPCRouter({
  // Query tracking status
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

  // Update order with new tracking information
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

        if (trackingInfo.code === 200 && trackingInfo.data_count > 0) {
          const updatedOrder = await ctx.db.order.update({
            where: { id: input.orderId },
            data: {
              trackingCode: input.trackingCode,
              shippingStatus: "Enviado!",
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

        if (trackingInfo.code !== 200 || trackingInfo.data_count === 0) {
          const updatedOrder = await ctx.db.order.update({
            where: { id: input.orderId },
            data: {
              shippingStatus: "Não encontrado.",
            },
          });
          
          return {
            success: true,
            order: updatedOrder,
            trackingInfo: {
              status: "Não encontrado.",
              lastUpdate: null,
              history: [],
            },
          };
        }

        return {
          success: true,
          order,
          trackingInfo: {
            status: "Unsent",
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

  // Verify if tracking code exists
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

  // Batch update tracking information for multiple orders
  batchUpdateTracking: protectedProcedure
    .input(
      z.object({
        orderIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get all orders with tracking codes
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
              return ctx.db.order.update({
                where: { id: order.id },
                data: {
                  shippingStatus: "Enviado!",
                },
              });
            } else {
              return ctx.db.order.update({
                where: { id: order.id },
                data: {
                  shippingStatus: "Não encontrado.",
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
});
