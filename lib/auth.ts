import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Acesso interno",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            email,
          },
          include: {
            units: {
              include: {
                unit: true,
              },
            },
          },
        });

        if (!user || !user.passwordHash || user.status !== "ATIVO") {
          return null;
        }

        const passwordMatches = await compare(password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
          },
        });

        await prisma.auditLog.create({
          data: {
            companyId: user.companyId,
            unitId: user.units[0]?.unitId,
            userId: user.id,
            entityType: "user",
            entityId: user.id,
            action: "LOGIN",
            afterData: {
              email: user.email,
            },
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          companyId: user.companyId,
          accessLevel: user.accessLevel,
          status: user.status,
          phone: user.phone,
          units: user.units.map((membership) => ({
            id: membership.unit.id,
            name: membership.unit.name,
          })),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.companyId = user.companyId;
        token.accessLevel = user.accessLevel;
        token.status = user.status;
        token.phone = user.phone;
        token.units = user.units;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.companyId = token.companyId;
        session.user.accessLevel = token.accessLevel;
        session.user.status = token.status;
        session.user.phone = token.phone;
        session.user.units = token.units ?? [];
      }

      return session;
    },
  },
};
