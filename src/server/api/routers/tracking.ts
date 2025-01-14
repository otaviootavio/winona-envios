import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { OrderStatus } from "@prisma/client";
import { CorreiosAuthRepository } from "~/app/api/repositories/CorreiosAuthRepository";
import { CorreiosRepository } from "~/app/api/repositories/CorreiosRepository";
import type { createTRPCContext } from "~/server/api/trpc";

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// Schemas
const trackingCodeSchema = z.object({
  trackingCode: z.string().trim().min(1),
});

const updateTrackingSchema = z.object({
  orderId: z.string(),
  trackingCode: z.string().trim().min(1),
});

// Helper function to determine order status
const determineOrderStatus = (status: string): OrderStatus => {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes("entregue")) {
    return OrderStatus.DELIVERED;
  } else if (
    normalizedStatus.includes("trânsito") ||
    normalizedStatus.includes("transito")
  ) {
    return OrderStatus.IN_TRANSIT;
  }
  return OrderStatus.POSTED;
};

// Initialize the auth repository (can be reused)
const authRepo = new CorreiosAuthRepository();

// Helper function to get authenticated Correios repository
const getCorreiosRepository = async (
  ctx: Context,
): Promise<CorreiosRepository> => {
  const credentials = await ctx.db.correiosCredential.findUnique({
    where: { userId: ctx.session?.user.id },
  });

  if (!credentials) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Correios credentials not found",
    });
  }

  try {
    const tokenResponse = await authRepo.authenticateWithContract(
      {
        identifier: credentials.identifier,
        accessCode: credentials.accessCode,
      },
      {
        numero: credentials.contract,
        dr: undefined,
      },
    );

    return new CorreiosRepository(tokenResponse.token);
  } catch (error) {
    console.error("Authentication failed:", error);
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Failed to authenticate with Correios contract",
      cause: error,
    });
  }
};

// Helper function to process tracking information
// TODO
// Save the infos on our database ( perhaps use mongodb because the data are not relational)
const processTrackingInfo = async (
  correiosRepo: CorreiosRepository,
  trackingCode: string,
) => {
  const tracking = await correiosRepo.getObjectTracking(trackingCode, "U");

  if (!tracking?.objetos?.[0]?.eventos?.length) {
    return {
      success: false,
      status: OrderStatus.NOT_FOUND,
      data: null,
    };
  }

  const latestEvent = tracking.objetos[0].eventos[0];
  if (!latestEvent) {
    return {
      success: false,
      status: OrderStatus.NOT_FOUND,
      data: null,
    };
  }

  return {
    success: true,
    status: determineOrderStatus(latestEvent.descricao),
    data: {
      status: latestEvent.descricao,
      lastUpdate: latestEvent.dtHrCriado,
      history: tracking.objetos[0].eventos,
    },
  };
};

export const trackingRouter = createTRPCRouter({
  getStatus: protectedProcedure
    .input(trackingCodeSchema)
    .query(async ({ ctx, input }) => {
      try {
        const correiosRepo = await getCorreiosRepository(ctx);
        const result = await processTrackingInfo(
          correiosRepo,
          input.trackingCode,
        );

        if (!result.success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tracking code not found or invalid",
          });
        }

        return {
          exists: true,
          ...result.data,
        };
      } catch (error) {
        if (error instanceof TRPCError && error.code === "UNAUTHORIZED") {
          throw error;
        }
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
        const correiosRepo = await getCorreiosRepository(ctx);
        const result = await processTrackingInfo(
          correiosRepo,
          input.trackingCode,
        );

        const updatedOrder = await ctx.db.order.update({
          where: { id: input.orderId },
          data: {
            trackingCode: input.trackingCode,
            shippingStatus: result.status,
          },
        });

        return {
          success: true,
          order: updatedOrder,
          trackingInfo: result.data ?? {
            status: "Not Found",
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
    .query(async ({ ctx, input }) => {
      try {
        const correiosRepo = await getCorreiosRepository(ctx);
        const result = await processTrackingInfo(
          correiosRepo,
          input.trackingCode,
        );
        return { exists: result.success };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify tracking code",
          cause: error,
        });
      }
    }),

  batchUpdateTracking: protectedProcedure
    .input(z.object({ orderIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const correiosRepo = await getCorreiosRepository(ctx);

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
            const result = await processTrackingInfo(
              correiosRepo,
              order.trackingCode,
            );

            return ctx.db.order.update({
              where: { id: order.id },
              data: {
                shippingStatus: result.status,
              },
            });
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
      const orders = await ctx.db.order.findMany({
        where: {
          trackingCode: { not: null },
          orderImport: {
            userId: ctx.session.user.id,
          },
        },
      });

      const batchSize = 50;
      const batches = [];

      for (let i = 0; i < orders.length; i += batchSize) {
        batches.push(orders.slice(i, i + batchSize));
      }

      let successCount = 0;

      for (const batch of batches) {
        // Refresh token for each batch to ensure it's valid
        const currentRepo = await getCorreiosRepository(ctx);

        const updates = await Promise.allSettled(
          batch.map(async (order) => {
            if (!order.trackingCode) return null;

            try {
              const result = await processTrackingInfo(
                currentRepo,
                order.trackingCode,
              );

              return ctx.db.order.update({
                where: { id: order.id },
                data: {
                  shippingStatus: result.status,
                },
              });
            } catch (error) {
              console.error(
                `Failed to update tracking for order ${order.id}:`,
                error,
              );
              return null;
            }
          }),
        );

        successCount += updates.filter(
          (result) => result.status === "fulfilled" && result.value !== null,
        ).length;

        // Add delay between batches to respect rate limits
        if (batches.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      return {
        totalProcessed: orders.length,
        successfulUpdates: successCount,
      };
    } catch (error) {
      if (error instanceof TRPCError && error.code === "UNAUTHORIZED") {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update orders",
        cause: error,
      });
    }
  }),
});
