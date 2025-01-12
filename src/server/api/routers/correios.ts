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
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Save credentials to database
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

        // Test the credentials immediately
        const authRepo = new CorreiosAuthRepository();
        await authRepo.authenticateWithContract(
          {
            identifier: input.identifier,
            accessCode: input.accessCode,
          },
          {
            numero: input.contract,
            dr: input.regionalNumber,
          }
        );

        return { success: true, credentials };
      } catch (error) {
        console.error("Failed to save or validate credentials:", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Erro ao salvar credenciais",
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

  // Add a new procedure to test authentication
  testAuth: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const credentials = await ctx.db.correiosCredential.findUnique({
        where: {
          userId: ctx.session.user.id,
        },
      });

      if (!credentials) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Credenciais não encontradas",
        });
      }

      const authRepo = new CorreiosAuthRepository();
      const authResult = await authRepo.authenticateWithContract(
        {
          identifier: credentials.identifier,
          accessCode: credentials.accessCode,
        },
        {
          numero: credentials.contract,
        }
      );

      return {
        success: true,
        tokenExpiration: authResult.expiraEm,
        environment: authResult.ambiente,
      };
    } catch (error) {
      console.error("Auth test failed:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Erro ao testar autenticação",
      });
    }
  }),
});