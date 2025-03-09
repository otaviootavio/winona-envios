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
  teamId: z.string(),
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
  teamId?: string,
  tokenCache?: { token: string; expiry: Date },
): Promise<{ repo: CorreiosRepository; tokenCache: { token: string; expiry: Date } }> => {
  // If we have a valid cached token, reuse it
  if (tokenCache && new Date() < tokenCache.expiry) {
    return { 
      repo: new CorreiosRepository(tokenCache.token),
      tokenCache
    };
  }

  // Get the team - either specified team or personal team
  const team = teamId
    ? await ctx.db.team.findFirst({
        where: {
          id: teamId,
          OR: [
            { adminId: ctx.session?.user.id },
            { members: { some: { userId: ctx.session?.user.id } } },
          ],
        },
        include: {
          correiosCredential: true,
        },
      })
    : await ctx.db.team.findFirst({
        where: {
          personalForId: ctx.session?.user.id,
        },
        include: {
          correiosCredential: true,
        },
      });

  if (!team?.correiosCredential) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: teamId
        ? "You don't have access to this team's Correios credentials"
        : "Correios credentials not found",
    });
  }

  try {
    const tokenResponse = await authRepo.authenticateWithContract(
      {
        identifier: team.correiosCredential.identifier,
        accessCode: team.correiosCredential.accessCode,
      },
      {
        numero: team.correiosCredential.contract,
        dr: undefined,
      },
    );

    // Calculate expiry time (subtract 5 minutes for safety margin)
    const expiryDate = new Date(tokenResponse.expiraEm);
    expiryDate.setMinutes(expiryDate.getMinutes() - 5);
    
    const newTokenCache = { 
      token: tokenResponse.token, 
      expiry: expiryDate 
    };
    
    return { 
      repo: new CorreiosRepository(tokenResponse.token),
      tokenCache: newTokenCache
    };
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
        const { repo } = await getCorreiosRepository(ctx);
        const result = await processTrackingInfo(
          repo,
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
          userId: ctx.session.user.id,
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found.",
        });
      }

      try {
        const { repo } = await getCorreiosRepository(ctx, input.teamId);
        const result = await processTrackingInfo(
          repo,
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
        const { repo } = await getCorreiosRepository(ctx);
        const result = await processTrackingInfo(
          repo,
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
    .input(
      z.object({
        orderIds: z.array(z.string()),
        teamId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { repo } = await getCorreiosRepository(ctx, input.teamId);

      const orders = await ctx.db.order.findMany({
        where: {
          id: { in: input.orderIds },
          trackingCode: { not: null },
          userId: ctx.session.user.id,
        },
      });

      const updates = await Promise.allSettled(
        orders.map(async (order) => {
          if (!order.trackingCode) return null;

          try {
            const result = await processTrackingInfo(
              repo,
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

  batchUpdateAllOrders: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get all orders with tracking codes
        const orders = await ctx.db.order.findMany({
          where: {
            trackingCode: { not: null },
            userId: ctx.session.user.id,
          },
        });

        if (orders.length === 0) {
          return {
            totalProcessed: 0,
            successfulUpdates: 0,
          };
        }

        const batchSize = 50; // Maximum allowed by Correios API
        const batches = [];

        for (let i = 0; i < orders.length; i += batchSize) {
          batches.push(orders.slice(i, i + batchSize));
        }

        let successCount = 0;
        let tokenCache: { token: string; expiry: Date; } | undefined = undefined;

        for (const batch of batches) {
          try {
            // Reuse token if available
            const { repo, tokenCache: newTokenCache } = await getCorreiosRepository(
              ctx, 
              input.teamId,
              tokenCache
            );
            
            // Update token cache for next iteration
            tokenCache = newTokenCache;
            
            // Extract tracking codes from the batch
            const trackingCodes = batch
              .map(order => order.trackingCode)
              .filter(Boolean) as string[];
            
            if (trackingCodes.length === 0) continue;
            
            // Use batch API call instead of individual calls
            const trackingResponse = await repo.getMultipleObjectsTracking(trackingCodes, "U");
            
            // Group orders by status to reduce database calls
            const orderUpdates: Record<OrderStatus, string[]> = {
              [OrderStatus.DELIVERED]: [],
              [OrderStatus.IN_TRANSIT]: [],
              [OrderStatus.POSTED]: [],
              [OrderStatus.NOT_FOUND]: [],
              [OrderStatus.UNKNOWN]: [],
            };
            
            // Process the batch response and group by status
            batch.forEach(order => {
              if (!order.trackingCode) return;
              
              // Find this order's tracking info in the batch response
              const trackingObject = trackingResponse.objetos.find(
                obj => obj.codObjeto === order.trackingCode
              );
              
              if (!trackingObject?.eventos?.length) {
                orderUpdates[OrderStatus.NOT_FOUND].push(order.id);
                return;
              }
              
              const latestEvent = trackingObject.eventos[0];
              if (!latestEvent) {
                orderUpdates[OrderStatus.NOT_FOUND].push(order.id);
                return;
              }
              
              const status = determineOrderStatus(latestEvent.descricao);
              orderUpdates[status].push(order.id);
            });
            
            // Only run transaction if we have updates to make
            const hasUpdates = Object.values(orderUpdates).some(ids => ids.length > 0);
            
            if (hasUpdates) {
              // Use a transaction to perform all updates in a single database operation
              const updateResults = await ctx.db.$transaction(
                Object.entries(orderUpdates)
                  .filter(([_, orderIds]) => orderIds.length > 0)
                  .map(([status, orderIds]) => 
                    ctx.db.order.updateMany({
                      where: { 
                        id: { in: orderIds },
                        userId: ctx.session.user.id 
                      },
                      data: { shippingStatus: status as OrderStatus }
                    })
                  )
              );
              
              // Count successful updates
              successCount += updateResults.reduce((sum, result) => sum + result.count, 0);
            }
          } catch (error) {
            console.error(`Failed to process batch:`, error);
            // If token error, clear the cache to force re-authentication
            if (error instanceof TRPCError && error.code === "UNAUTHORIZED") {
              tokenCache = undefined;
            }
          }

          // Add delay between batches to respect rate limits
          if (batches.length > 1 && batches.indexOf(batch) < batches.length - 1) {
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
