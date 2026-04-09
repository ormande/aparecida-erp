import { compare } from "bcryptjs";
import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export type AppAccessLevel = "PROPRIETARIO" | "GESTOR" | "FUNCIONARIO";

export type RequiredSessionContext = {
  session: Session;
  userId: string;
  companyId: string;
  activeUnitId: string;
};

export function checkRole(session: Session, allowedRoles: AppAccessLevel[]): boolean {
  const level = session.user?.accessLevel as AppAccessLevel | undefined;
  return level != null && allowedRoles.includes(level);
}

export type GetRequiredSessionContextOptions = {
  allowedRoles?: AppAccessLevel[];
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 14 * 60 * 60,
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
        token.activeUnitId = user.units?.[0]?.id;
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
        session.user.activeUnitId = token.activeUnitId ?? token.units?.[0]?.id;
      }

      return session;
    },
  },
};

/**
 * Sessão autenticada. `activeUnitId` usa a primeira unidade do usuário no JWT quando existir
 * (necessário para APIs que vinculam registro à unidade, ex.: novo funcionário, OS).
 */
export async function getRequiredSessionContext(
  options?: GetRequiredSessionContextOptions,
): Promise<
  { ok: true; context: RequiredSessionContext } | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.companyId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (options?.allowedRoles?.length && !checkRole(session, options.allowedRoles)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const units = session.user.units ?? [];
  const activeUnitId = session.user.activeUnitId?.trim() || units[0]?.id || "";

  return {
    ok: true,
    context: {
      session,
      userId: session.user.id,
      companyId: session.user.companyId,
      activeUnitId,
    },
  };
}
