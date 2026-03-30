import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { mapCustomerToClient, mapServiceOrderStatus } from "@/lib/db-mappers";
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

  const customer = await prisma.customer.findFirst({
    where: {
      id: params.id,
      companyId: session.user.companyId,
    },
    include: {
      _count: {
        select: {
          vehicles: true,
        },
      },
      vehicles: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          plate: true,
          brand: true,
          model: true,
          year: true,
        },
      },
      serviceOrders: {
        orderBy: {
          openedAt: "desc",
        },
        take: 5,
        select: {
          id: true,
          number: true,
          status: true,
          totalAmount: true,
          openedAt: true,
          vehicle: {
            select: {
              plate: true,
            },
          },
        },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ message: "Cliente não encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    customer: mapCustomerToClient(customer),
    vehicles: customer.vehicles.map((vehicle) => ({
      id: vehicle.id,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
    })),
    latestOrders: customer.serviceOrders.map((order) => ({
      id: order.id,
      number: order.number,
      status: mapServiceOrderStatus(order.status),
      total: Number(order.totalAmount),
      openedAt: order.openedAt.toISOString().slice(0, 10),
      vehiclePlate: order.vehicle?.plate ?? "-",
    })),
  });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();

  if (!session) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = customerSchema.parse(await request.json());

  const existing = await prisma.customer.findFirst({
    where: {
      id: params.id,
      companyId: session.user.companyId,
    },
    include: {
      _count: {
        select: {
          vehicles: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Cliente não encontrado." }, { status: 404 });
  }

  const customer = await prisma.customer.update({
    where: {
      id: params.id,
    },
    data: {
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
      action: "UPDATE",
      beforeData: {
        id: existing.id,
        type: existing.type,
        status: existing.status,
      },
      afterData: {
        id: customer.id,
        type: customer.type,
        status: customer.status,
      },
    },
  });

  return NextResponse.json({ customer: mapCustomerToClient(customer) });
}
