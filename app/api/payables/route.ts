import { randomUUID } from "crypto";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { mapPayableToAppPayable } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

const payableSchema = z.object({
  description: z.string().min(2),
  category: z.enum(["Aluguel", "Fornecedores", "Água/Luz", "Funcionários", "Outros"]),
  supplierId: z.string().optional().nullable(),
  amount: z.coerce.number().min(0.01),
  dueDate: z.string().min(1),
  unitId: z.string().optional().nullable(),
  installments: z.coerce.number().int().min(1).max(24).default(1),
});

function mapCategory(category: "Aluguel" | "Fornecedores" | "Água/Luz" | "Funcionários" | "Outros") {
  switch (category) {
    case "Aluguel":
      return "ALUGUEL";
    case "Fornecedores":
      return "FORNECEDORES";
    case "Água/Luz":
      return "AGUA_LUZ";
    case "Funcionários":
      return "FUNCIONARIOS";
    case "Outros":
    default:
      return "OUTROS";
  }
}

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

  const payables = await prisma.accountPayable.findMany({
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
      supplier: {
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
    payables: payables.map((payable) => ({
      ...mapPayableToAppPayable(payable),
      supplierName: payable.supplier
        ? payable.supplier.type === "PF"
          ? payable.supplier.fullName ?? "-"
          : payable.supplier.tradeName ?? "-"
        : "-",
      unitName: payable.unit?.name ?? "Geral",
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = payableSchema.parse(await request.json());
  const installmentGroupId = payload.installments > 1 ? randomUUID() : null;
  const baseDate = new Date(`${payload.dueDate}T00:00:00`);

  const created = await prisma.$transaction(async (tx) => {
    const items = [];

    for (let index = 0; index < payload.installments; index += 1) {
      const dueDate = addMonths(baseDate, index);
      const item = await tx.accountPayable.create({
        data: {
          companyId: session.user.companyId,
          unitId: payload.unitId || null,
          supplierId: payload.supplierId || null,
          description:
            payload.installments > 1
              ? `${payload.description} (${index + 1}/${payload.installments})`
              : payload.description,
          category: mapCategory(payload.category),
          amount: payload.amount,
          dueDate,
          status: "PENDENTE",
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
        entityType: "payable",
        entityId: installmentGroupId ?? items[0].id,
        action: "CREATE",
        afterData: {
          count: items.length,
          supplierId: payload.supplierId,
          amount: payload.amount,
          sourceModule: "financeiro_pagar",
          originType: "MANUAL",
          installmentGroupId,
        },
      },
    });

    return items;
  });

  return NextResponse.json(
    {
      payables: created.map(mapPayableToAppPayable),
    },
    { status: 201 },
  );
}
