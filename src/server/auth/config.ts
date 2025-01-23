import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { type AdapterUser } from "@auth/core/adapters";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  adapter: {
    ...PrismaAdapter(db),
    createUser: async (data) => {
      const result = await db.$transaction(async (tx) => {
        // Create user with required email field
        const user = await tx.user.create({
          data: {
            ...data,
            email: data.email ?? "",
          },
        });

        // Create personal team
        await tx.team.create({
          data: {
            name: `${user.name ?? "User"}'s Personal Team`,
            adminId: user.id,
            personalForId: user.id,
          },
        });

        return user;
      });

      return {
        id: result.id,
        email: result.email ?? "",
        emailVerified: result.emailVerified,
        name: result.name,
        image: result.image,
      } satisfies AdapterUser;
    },
  },
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
} satisfies NextAuthConfig;
