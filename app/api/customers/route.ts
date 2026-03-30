import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { mapCustomerToClient } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

const customerSchema = z.object({
  tipo: z.enum(["pf", "pj"]),
  situacao: z.enum(["Ativo", "Inativo"]),
  celular: z.string().min(1),
  whatsapp: z.string().optional().default(""),
  email: z.string().optional().default(""),
  observacoes: z.string().optional().default(""),
  nomeCompleto: z.string().optional().default(""),
  cpf: z.string().optional().default(""),
  dataNascimento: z.string().optional().default(""),
  nomeFantasia: z.string().optional().default(""),
  razaoSocial: z.string().optional().default(""),
  cnpj: z.string().optional().default(""),
});

function mapStatus(status: "Ativo" | "Inativo") {
  return status === "Ativo" ? "ATIVO" : "INATIVO";
}

function mapType(type: "pf" | "pj") {
  return type === "pf" ? "PF" : "PJ";
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const customers = await prisma.customer.findMany({
    where: {
      companyId: session.user.companyId,
    },
    include: {
      _count: {
        select: {
          vehicles: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json({
    customers: customers.map(mapCustomerToClient),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = customerSchema.parse(await request.json());

  const customer = await prisma.customer.create({
    data: {
      companyId: session.user.companyId,
      type: mapType(payload.tipo),
      status: mapStatus(payload.situacao),
      phone: payload.celular,
      whatsapp: payload.whatsapp || payload.celular,
      email: payload.email || null,
      notes: payload.observacoes || null,
      fullName: payload.tipo === "pf" ? payload.nomeCompleto || null : null,
      cpf: payload.tipo === "pf" ? payload.cpf || null : null,
      birthDate: payload.tipo === "pf" && payload.dataNascimento ? new Date(`${payload.dataNascimento}T00:00:00`) : null,
      tradeName: payload.tipo === "pj" ? payload.nomeFantasia || null : null,
      legalName: payload.tipo === "pj" ? payload.razaoSocial || null : null,
      cnpj: payload.tipo === "pj" ? payload.cnpj || null : null,
    },
    include: {
      _count: {
        select: {
          vehicles: true,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId,
      userId: session.user.id,
      entityType: "customer",
      entityId: customer.id,
      action: "CREATE",
      afterData: {
        id: customer.id,
        type: customer.type,
      },
    },
  });

  return NextResponse.json({ customer: mapCustomerToClient(customer) }, { status: 201 });
}
