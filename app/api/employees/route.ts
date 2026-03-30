import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { mapUserToEmployee } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

const employeeSchema = z.object({
  nomeCompleto: z.string().min(2),
  email: z.string().email(),
  telefone: z.string().optional().default(""),
  nivelAcesso: z.enum(["Proprietário", "Funcionário"]),
  situacao: z.enum(["Ativo", "Inativo"]),
});

function mapAccessLevel(level: "Proprietário" | "Funcionário") {
  return level === "Proprietário" ? "PROPRIETARIO" : "FUNCIONARIO";
}

function mapStatus(status: "Ativo" | "Inativo") {
  return status === "Ativo" ? "ATIVO" : "INATIVO";
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: {
      companyId: session.user.companyId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      accessLevel: true,
      status: true,
    },
  });

  return NextResponse.json({
    employees: users.map(mapUserToEmployee),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  if (session.user.accessLevel !== "PROPRIETARIO") {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const payload = employeeSchema.parse(await request.json());
  const email = payload.email.trim().toLowerCase();

  const exists = await prisma.user.findFirst({
    where: {
      companyId: session.user.companyId,
      email,
    },
    select: { id: true },
  });

  if (exists) {
    return NextResponse.json({ message: "Já existe um funcionário com esse e-mail." }, { status: 409 });
  }

  const firstUnit = await prisma.userUnit.findFirst({
    where: {
      userId: session.user.id,
    },
    select: {
      unitId: true,
    },
  });

  const user = await prisma.user.create({
    data: {
      companyId: session.user.companyId,
      name: payload.nomeCompleto,
      email,
      phone: payload.telefone || null,
      accessLevel: mapAccessLevel(payload.nivelAcesso),
      status: mapStatus(payload.situacao),
      units: firstUnit
        ? {
            create: {
              unitId: firstUnit.unitId,
            },
          }
        : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      accessLevel: true,
      status: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId,
      unitId: firstUnit?.unitId,
      userId: session.user.id,
      entityType: "employee",
      entityId: user.id,
      action: "CREATE",
      afterData: {
        name: user.name,
        email: user.email,
      },
    },
  });

  return NextResponse.json({ employee: mapUserToEmployee(user) }, { status: 201 });
}
