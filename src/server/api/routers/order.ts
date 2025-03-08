import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { SortableFields } from "~/constants/order";
import { TRPCError } from "@trpc/server";
import { OrderStatus, type Prisma } from "@prisma/client";

const orderSchema = z.object({
  orderNumber: z.string().trim().min(1),
  shippingStatus: z.nativeEnum(OrderStatus),
  trackingCode: z.string().trim().nullable(),
});

const importOrdersSchema = z.object({
  fileName: z.string().trim().min(1),
  orders: z.array(orderSchema).min(1),
});

const sortOrderSchema = z.enum(["asc", "desc"]).default("asc");
const sortFieldSchema = z
  .enum([SortableFields.ORDER_NUMBER, SortableFields.UPDATED_AT])
  .default(SortableFields.UPDATED_AT);

const orderFilterSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  hasTracking: z.boolean().optional(),
});

export const orderRouter = createTRPCRouter({
  import: protectedProcedure
    .input(importOrdersSchema)
    .mutation(async ({ ctx, input }) => {
      try {

        // Use a transaction to ensure both operations are atomic
        const result = await ctx.db.$transaction(async (tx) => {
          // First, delete all existing orders for the user
          await tx.order.deleteMany({
            where: {
              userId: ctx.session.user.id,
            },
          });

          // Then create the new orders
          const orders = await tx.order.createMany({
            data: input.orders.map(
              (order) =>
                ({
                  orderNumber: order.orderNumber,
                  shippingStatus: OrderStatus.UNKNOWN,
                  trackingCode: order.trackingCode,
                  fileName: input.fileName,
                  userId: ctx.session.user.id,
                }) satisfies Prisma.OrderCreateManyInput,
            ),
          });

          return orders;
        });

        return {
          totalOrders: result.count,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to import orders",
          cause: error,
        });
      }
    }),

  getImportsSummary: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get the latest import info directly from orders
      const latestOrder = await ctx.db.order.findFirst({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        select: {
          fileName: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!latestOrder) return null;

      const orderCount = await ctx.db.order.count({
        where: {
          userId: ctx.session.user.id,
          fileName: latestOrder.fileName,
        },
      });

      return [{
        fileName: latestOrder.fileName,
        createdAt: latestOrder.createdAt,
        updatedAt: latestOrder.updatedAt,
        _count: { orders: orderCount },
      }];
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch import summary",
        cause: error,
      });
    }
  }),

  getImportOrders: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        filters: orderFilterSchema.optional(),
        sortBy: sortFieldSchema,
        sortOrder: sortOrderSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: Prisma.OrderWhereInput = {
          userId: ctx.session.user.id,
          ...(input.filters?.search
            ? {
                OR: [
                  { orderNumber: { contains: input.filters.search } },
                  { trackingCode: { contains: input.filters.search } },
                ],
              }
            : {}),
          ...(input.filters?.status
            ? { shippingStatus: input.filters.status }
            : {}),
          ...(input.filters?.hasTracking !== undefined
            ? input.filters.hasTracking
              ? { trackingCode: { not: null } }
              : { trackingCode: null }
            : {}),
        };

        const [orders, total] = await Promise.all([
          ctx.db.order.findMany({
            where,
            take: input.pageSize,
            skip: (input.page - 1) * input.pageSize,
            orderBy: { [input.sortBy]: input.sortOrder },
          }),
          ctx.db.order.count({ where }),
        ]);

        return {
          orders,
          pagination: {
            total,
            pageCount: Math.ceil(total / input.pageSize),
            page: input.page,
            pageSize: input.pageSize,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch orders",
          cause: error,
        });
      }
    }),

  getOrderStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await ctx.db.order.groupBy({
        by: ["shippingStatus"],
        where: {
          userId: ctx.session.user.id,
        },
        _count: true,
      });

      const totalOrders = stats.reduce((sum, stat) => sum + stat._count, 0);
      const trackingCount = await ctx.db.order.count({
        where: {
          userId: ctx.session.user.id,
          trackingCode: { not: null },
        },
      });

      return {
        statusBreakdown: stats,
        totalOrders,
        trackingCount,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch order stats",
        cause: error,
      });
    }
  }),
});
