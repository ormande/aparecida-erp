import { randomUUID } from "crypto";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { mapReceivableToAppReceivable } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

const receivableSchema = z.object({
  description: z.string().min(2),
  customerId: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  dueDate: z.string().min(1),
  unitId: z.string().optional().nullable(),
  installments: z.coerce.number().int().min(1).max(24).default(1),
});

function addMonths(base: Date, months: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const unitId = searchParams.get("unitId");
  const period = searchParams.get("period");

  const receivables = await prisma.accountReceivable.findMany({
    where: {
      companyId: session.user.companyId,
      status: status === "Pago" ? "PAGO" : status === "Vencido" ? "VENCIDO" : status === "Pendente" ? "PENDENTE" : undefined,
      unitId: unitId === "general" ? null : unitId || undefined,
      ...(period
        ? {
            dueDate: {
              gte: new Date(`${period}-01T00:00:00`),
              lt: new Date(`${period}-31T23:59:59`),
            },
          }
        : {}),
    },
    include: {
      customer: {
        select: {
          type: true,
          fullName: true,
          tradeName: true,
        },
      },
      unit: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  return NextResponse.json({
    receivables: receivables.map((receivable) => ({
      ...mapReceivableToAppReceivable(receivable),
      clientName: receivable.customer
        ? receivable.customer.type === "PF"
          ? receivable.customer.fullName ?? "-"
          : receivable.customer.tradeName ?? "-"
        : "-",
      unitName: receivable.unit?.name ?? "Geral",
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = receivableSchema.parse(await request.json());
  const installmentGroupId = payload.installments > 1 ? randomUUID() : null;
  const baseDate = new Date(`${payload.dueDate}T00:00:00`);

  const created = await prisma.$transaction(async (tx) => {
    const items = [];

    for (let index = 0; index < payload.installments; index += 1) {
      const dueDate = addMonths(baseDate, index);
      const item = await tx.accountReceivable.create({
        data: {
          companyId: session.user.companyId,
          unitId: payload.unitId || null,
          customerId: payload.customerId,
          description:
            payload.installments > 1
              ? `${payload.description} (${index + 1}/${payload.installments})`
              : payload.description,
          amount: payload.amount,
          dueDate,
          status: "PENDENTE",
          originType: "MANUAL",
          installmentGroupId,
          installmentNumber: payload.installments > 1 ? index + 1 : null,
          installmentCount: payload.installments > 1 ? payload.installments : null,
        },
      });
      items.push(item);
    }

    await tx.auditLog.create({
      data: {
        companyId: session.user.companyId,
        unitId: payload.unitId || null,
        userId: session.user.id,
        entityType: "receivable",
        entityId: installmentGroupId ?? items[0].id,
        action: "CREATE",
        afterData: {
          count: items.length,
          customerId: payload.customerId,
          amount: payload.amount,
          sourceModule: "financeiro_receber",
          originType: "MANUAL",
          installmentGroupId,
        },
      },
    });

    return items;
  });

  return NextResponse.json(
    {
      receivables: created.map(mapReceivableToAppReceivable),
    },
    { status: 201 },
  );
}
