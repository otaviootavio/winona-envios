import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

import { randomBytes } from "crypto";
const INVITE_EXPIRY_HOURS = 24;

// Input schemas
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
});

const inviteLinkSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
});

const joinTeamSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const teamIdSchema = z.object({
  teamId: z.string().min(1, "Team ID is required"),
});

export const teamRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createTeamSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const team = await ctx.db.team.create({
          data: {
            name: input.name,
            admin: { connect: { id: ctx.session.user.id } },
            members: {
              create: {
                user: { connect: { id: ctx.session.user.id } },
              },
            },
          },
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        });

        return { success: true, team };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create team",
          cause: error,
        });
      }
    }),

  getMyTeams: protectedProcedure.query(async ({ ctx }) => {
    try {
      const teams = await ctx.db.team.findMany({
        where: {
          OR: [
            { adminId: ctx.session.user.id },
            {
              members: {
                some: { userId: ctx.session.user.id },
              },
            },
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          correiosCredential: true,
        },
      });

      return teams;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch teams",
        cause: error,
      });
    }
  }),

  generateInviteLink: protectedProcedure
    .input(inviteLinkSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user is admin
        const team = await ctx.db.team.findFirst({
          where: {
            id: input.teamId,
            adminId: ctx.session.user.id,
          },
        });

        if (!team) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team not found or you don't have permission",
          });
        }

        // Generate a secure random token
        const token = randomBytes(32).toString("hex");

        // Calculate expiry time
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);

        // Store the invite in the database
        const invite = await ctx.db.teamInvite.create({
          data: {
            token,
            team: { connect: { id: team.id } },
            expiresAt,
          },
        });

        return {
          success: true,
          inviteLink: `/join-team?token=${invite.token}`,
          expiresAt: invite.expiresAt,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate invite link",
          cause: error,
        });
      }
    }),

  join: protectedProcedure
    .input(joinTeamSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Find and validate the invite
        const invite = await ctx.db.teamInvite.findUnique({
          where: { token: input.token },
          include: { team: true },
        });

        if (!invite) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invalid invite link",
          });
        }

        if (invite.usedAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This invite link has already been used",
          });
        }

        if (invite.expiresAt < new Date()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This invite link has expired",
          });
        }

        // Check if user is already a member
        const existingMembership = await ctx.db.teamMember.findFirst({
          where: {
            teamId: invite.teamId,
            userId: ctx.session.user.id,
          },
        });

        if (existingMembership) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You are already a member of this team",
          });
        }

        // Add user to team and mark invite as used
        await ctx.db.$transaction([
          ctx.db.teamMember.create({
            data: {
              team: { connect: { id: invite.teamId } },
              user: { connect: { id: ctx.session.user.id } },
            },
          }),
          ctx.db.teamInvite.update({
            where: { id: invite.id },
            data: { usedAt: new Date() },
          }),
        ]);

        return {
          success: true,
          team: invite.team,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to join team",
          cause: error,
        });
      }
    }),

  removeMember: protectedProcedure
    .input(
      z.object({
        teamId: z.string().min(1),
        userId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const team = await ctx.db.team.findFirst({
          where: {
            id: input.teamId,
            adminId: ctx.session.user.id,
          },
        });

        if (!team) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team not found or you don't have permission",
          });
        }

        if (input.userId === ctx.session.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "You cannot remove yourself using this endpoint. Use 'exitTeam' instead",
          });
        }

        await ctx.db.teamMember.deleteMany({
          where: {
            teamId: input.teamId,
            userId: input.userId,
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove team member",
          cause: error,
        });
      }
    }),

  exitTeam: protectedProcedure
    .input(teamIdSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const team = await ctx.db.team.findFirst({
          where: {
            id: input.teamId,
            members: {
              some: {
                userId: ctx.session.user.id,
              },
            },
          },
        });

        if (!team) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team not found or you're not a member",
          });
        }

        if (team.adminId === ctx.session.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Team admin cannot exit. Use 'deleteTeam' instead",
          });
        }

        await ctx.db.teamMember.deleteMany({
          where: {
            teamId: input.teamId,
            userId: ctx.session.user.id,
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to exit team",
          cause: error,
        });
      }
    }),

  deleteTeam: protectedProcedure
    .input(teamIdSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const team = await ctx.db.team.findFirst({
          where: {
            id: input.teamId,
            adminId: ctx.session.user.id,
          },
        });

        if (!team) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team not found or you're not the admin",
          });
        }

        // Delete the team and all related records
        await ctx.db.team.delete({
          where: {
            id: input.teamId,
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete team",
          cause: error,
        });
      }
    }),
});
