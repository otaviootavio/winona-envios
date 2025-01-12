import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { CorreiosAuthRepository } from "~/app/api/repositories/CorreiosAuthRepository";

export const correiosRouter = createTRPCRouter({
  saveCredentials: protectedProcedure
    .input(
      z.object({
        identifier: z
          .string()
          .min(11, "CPF/CNPJ deve ter no mínimo 11 caracteres")
          .max(14, "CPF/CNPJ deve ter no máximo 14 caracteres"),
        accessCode: z.string().min(1, "Código de acesso é obrigatório"),
        contract: z.string().min(1, "Contrato é obrigatório"),
        regionalNumber: z.number().optional(), // DR number is optional
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate credentials first
        const authRepo = new CorreiosAuthRepository();
        await authRepo.authenticateWithContract(
          {
            identifier: input.identifier,
            accessCode: input.accessCode,
          },
          {
            numero: input.contract,
            dr: input.regionalNumber,
          },
        );

        // Only save if validation was successful
        const credentials = await ctx.db.correiosCredential.upsert({
          where: {
            userId: ctx.session.user.id,
          },
          create: {
            identifier: input.identifier,
            accessCode: input.accessCode,
            contract: input.contract,
            userId: ctx.session.user.id,
          },
          update: {
            identifier: input.identifier,
            accessCode: input.accessCode,
            contract: input.contract,
          },
        });

        return { success: true, credentials };
      } catch (error) {
        console.error("Failed to validate or save credentials:", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Credenciais inválidas ou erro ao salvar",
        });
      }
    }),

  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    try {
      const credentials = await ctx.db.correiosCredential.findUnique({
        where: {
          userId: ctx.session.user.id,
        },
      });

      return credentials;
    } catch (_error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao buscar credenciais",
      });
    }
  }),
});
