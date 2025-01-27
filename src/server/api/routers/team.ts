import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";

const INVITE_EXPIRY_HOURS = 24;

// Input schemas
const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  isPersonal: z.boolean().optional().default(false),
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
        // Check if user already has a personal team if creating one
        if (input.isPersonal) {
          const existingPersonalTeam = await ctx.db.team.findFirst({
            where: {
              personalForId: ctx.session.user.id,
            },
          });

          if (existingPersonalTeam) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "You already have a personal team",
            });
          }
        }

        const team = await ctx.db.team.create({
          data: {
            name: input.name,
            admin: { connect: { id: ctx.session.user.id } },
            ...(input.isPersonal && {
              personalFor: { connect: { id: ctx.session.user.id } },
            }),
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
            { personalForId: ctx.session.user.id },
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

  getPersonalTeam: protectedProcedure.query(async ({ ctx }) => {
    try {
      const personalTeam = await ctx.db.team.findFirst({
        where: {
          personalForId: ctx.session.user.id,
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
          personalFor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          correiosCredential: true,
        },
      });

      if (!personalTeam) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Personal team not found",
        });
      }

      return personalTeam;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch personal team",
        cause: error,
      });
    }
  }),

  getOwnedTeams: protectedProcedure.query(async ({ ctx }) => {
    try {
      const ownedTeams = await ctx.db.team.findMany({
        where: {
          adminId: ctx.session.user.id,
          personalForId: null, // Exclude personal teams
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

      return ownedTeams;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch owned teams",
        cause: error,
      });
    }
  }),

  getMemberships: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      where: {
        members: { some: { userId: ctx.session.user.id } },
        adminId: { not: ctx.session.user.id },
        personalForId: null,
      },
      include: {
        correiosCredential: {
          select: {
            id: true,
            identifier: true,
            contract: true,
            createdAt: true,
          },
        },
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
  }),

  generateInviteLink: protectedProcedure
    .input(inviteLinkSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user is admin and team is not a personal team
        const team = await ctx.db.team.findFirst({
          where: {
            id: input.teamId,
            adminId: ctx.session.user.id,
            personalForId: null, // Cannot generate invites for personal teams
          },
        });

        if (!team) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team not found or you don't have permission",
          });
        }

        const token = randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRY_HOURS);

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
        const invite = await ctx.db.teamInvite.findUnique({
          where: { token: input.token },
          include: { team: true },
        });

        if (!invite || !invite.team || invite.team.personalForId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invalid invite link or cannot join personal team",
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
            personalForId: null, // Cannot remove members from personal teams
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
            personalForId: null, // Cannot exit personal teams
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

        console.log("DELETE TEAM", team);

        if (!!team.personalForId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete personal team",
          });
        }

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

  getSelectedTeam: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userWithTeam = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: {
          selectedTeam: {
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
              personalFor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              admin: {
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

      return userWithTeam?.selectedTeam ?? null;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch selected team",
        cause: error,
      });
    }
  }),

  // Update the user's selected team
  updateSelectedTeam: protectedProcedure
    .input(z.object({ teamId: z.string().min(1, "Team ID is required") }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify team exists and user has access
        const validTeam = await ctx.db.team.findFirst({
          where: {
            id: input.teamId,
            OR: [
              { adminId: ctx.session.user.id },
              { personalForId: ctx.session.user.id },
              { members: { some: { userId: ctx.session.user.id } } },
            ],
          },
        });

        if (!validTeam) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Team not found or you don't have access",
          });
        }

        // Update selected team
        const updatedUser = await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            selectedTeam: {
              connect: { id: input.teamId },
            },
          },
          include: {
            selectedTeam: {
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
            },
          },
        });

        return updatedUser.selectedTeam;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update selected team",
          cause: error,
        });
      }
    }),
});
