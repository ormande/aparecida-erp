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

async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return null;
  }

  return session;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();

  if (!session) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: params.id,
      companyId: session.user.companyId,
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

  if (!user) {
    return NextResponse.json({ message: "Funcionário não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ employee: mapUserToEmployee(user) });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();

  if (!session) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = employeeSchema.parse(await request.json());
  const email = payload.email.trim().toLowerCase();

  const existing = await prisma.user.findFirst({
    where: {
      id: params.id,
      companyId: session.user.companyId,
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

  if (!existing) {
    return NextResponse.json({ message: "Funcionário não encontrado." }, { status: 404 });
  }

  const conflict = await prisma.user.findFirst({
    where: {
      companyId: session.user.companyId,
      email,
      id: { not: params.id },
    },
    select: { id: true },
  });

  if (conflict) {
    return NextResponse.json({ message: "Já existe um funcionário com esse e-mail." }, { status: 409 });
  }

  const user = await prisma.user.update({
    where: {
      id: params.id,
    },
    data: {
      name: payload.nomeCompleto,
      email,
      phone: payload.telefone || null,
      accessLevel: mapAccessLevel(payload.nivelAcesso),
      status: mapStatus(payload.situacao),
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
      userId: session.user.id,
      entityType: "employee",
      entityId: user.id,
      action: "UPDATE",
      beforeData: existing,
      afterData: user,
    },
  });

  return NextResponse.json({ employee: mapUserToEmployee(user) });
}
