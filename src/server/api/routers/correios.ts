import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { testCorreiosCredentials } from "../utils/testCorreiosCredentials";

export const correiosRouter = createTRPCRouter({
  saveCredentials: protectedProcedure
    .input(
      z.object({
        teamId: z.string().min(1, "Team ID is required"),
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
        // Check team admin permission
        const team = await ctx.db.team.findFirst({
          where: {
            id: input.teamId,
            adminId: ctx.session.user.id,
          },
        });

        if (!team) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não autorizado ou time não encontrado",
          });
        }

        const testResult = await testCorreiosCredentials({
          identifier: input.identifier,
          accessCode: input.accessCode,
          contract: {
            number: input.contract,
            dr: input.regionalNumber,
          },
        });

        if (!testResult.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: testResult.error ?? "Failed to validate credentials",
          });
        }

        const credentials = await ctx.db.correiosCredential.upsert({
          where: {
            teamId: input.teamId,
          },
          create: {
            identifier: input.identifier,
            accessCode: input.accessCode,
            contract: input.contract,
            team: { connect: { id: input.teamId } },
            createdBy: { connect: { id: ctx.session.user.id } },
            updatedBy: { connect: { id: ctx.session.user.id } },
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

  saveTeamCredentials: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        identifier: z.string(),
        accessCode: z.string(),
        contract: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, ...credentials } = input;

      // Verify team ownership/access
      const team = await ctx.db.team.findFirst({
        where: {
          id: teamId,
          OR: [
            { adminId: ctx.session.user.id },
            { personalForId: ctx.session.user.id },
          ],
        },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found or access denied",
        });
      }

      const testResult = await testCorreiosCredentials({
        identifier: credentials.identifier,
        accessCode: credentials.accessCode,
        contract: { number: credentials.contract },
      });

      if (!testResult.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: testResult.error ?? "Failed to validate credentials",
        });
      }

      // Handle both createdBy and updatedBy relations
      const result = await ctx.db.correiosCredential.upsert({
        where: {
          teamId: teamId,
        },
        create: {
          ...credentials,
          team: { connect: { id: teamId } },
          createdBy: { connect: { id: ctx.session.user.id } },
          updatedBy: { connect: { id: ctx.session.user.id } },
        },
        update: {
          ...credentials,
          updatedBy: { connect: { id: ctx.session.user.id } },
        },
      });

      return result;
    }),

  getCredentials: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const team = await ctx.db.team.findFirst({
          where: {
            id: input.teamId,
          },
        });

        if (team?.adminId !== ctx.session.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Não é administrador do time",
          });
        }

        return await ctx.db.correiosCredential.findUnique({
          where: {
            teamId: input.teamId,
          },
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao buscar credenciais",
        });
      }
    }),
  deleteCredentials: protectedProcedure
    .input(
      z.object({
        teamId: z.string().min(1, "Team ID is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check team admin permission
        const team = await ctx.db.team.findFirst({
          where: {
            id: input.teamId,
            OR: [
              { adminId: ctx.session.user.id },
              { personalForId: ctx.session.user.id },
            ],
          },
        });

        if (!team) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Not authorized or team not found",
          });
        }

        // Delete the credentials
        await ctx.db.correiosCredential.delete({
          where: {
            teamId: input.teamId,
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete credentials",
          cause: error,
        });
      }
    }),
});
