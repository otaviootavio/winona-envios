import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const orderSchema = z.object({
  orderNumber: z.string().trim().min(1),
  shippingStatus: z.string().trim().min(1),
  trackingCode: z.string().trim().nullable(),
});

const importOrdersSchema = z.object({
  fileName: z.string().trim().min(1),
  orders: z.array(orderSchema).min(1),
});

export const orderRouter = createTRPCRouter({
  // Criar nova importação de pedidos
  import: protectedProcedure
    .input(importOrdersSchema)
    .mutation(async ({ ctx, input }) => {
      // Primeiro cria o registro de importação
      const orderImport = await ctx.db.orderImport.create({
        data: {
          fileName: input.fileName,
          status: "processing",
          user: { connect: { id: ctx.session.user.id } },
        },
      });

      // Depois cria todos os pedidos vinculados a esta importação
      const orders = await ctx.db.order.createMany({
        data: input.orders.map((order) => ({
          orderNumber: order.orderNumber,
          shippingStatus: order.shippingStatus,
          trackingCode: order.trackingCode,
          orderImportId: orderImport.id,
        })),
      });

      // Atualiza o status da importação para completed
      await ctx.db.orderImport.update({
        where: { id: orderImport.id },
        data: { status: "completed" },
      });

      return {
        importId: orderImport.id,
        totalOrders: orders.count,
      };
    }),

  // Listar importações do usuário
  listImports: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.orderImport.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });
  }),

  // Buscar pedidos de uma importação específica
  getImportOrders: protectedProcedure
    .input(
      z.object({
        importId: z.string(),
        page: z.number().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const perPage = 10;
      return ctx.db.order.findMany({
        where: {
          orderImportId: input.importId,
          orderImport: { userId: ctx.session.user.id },
        },
        take: perPage,
        skip: (input.page - 1) * perPage,
        orderBy: { createdAt: "desc" },
      });
    }),

  // Buscar resumo das últimas importações
  getImportsSummary: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.orderImport.findMany({
      where: { userId: ctx.session.user.id },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });
  }),
});
