import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countDistinctLogicalServiceOrders } from "@/lib/service-order-stats";

const querySchema = z.object({
  unitId: z.string().min(1).optional(),
});

function getCurrentMonthRange() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  return { monthStart, now };
}

export async function GET(request: NextRequest) {
  const auth = await getRequiredSessionContext({
    allowedRoles: ["PROPRIETARIO", "GESTOR"],
  });
  if (!auth.ok) {
    return auth.response;
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  let query: z.infer<typeof querySchema>;
  try {
    query = querySchema.parse({
      unitId: params.unitId || undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const { companyId } = auth.context;
  const { unitId } = query;
  const { monthStart, now } = getCurrentMonthRange();
  const unitFilter = unitId ? { unitId } : {};

  const baseMonth = {
    companyId,
    ...unitFilter,
    openedAt: { gte: monthStart, lte: now },
    status: { not: "CANCELADA" as const },
  };

  const [
    coletadasAgg,
    coletadasRows,
    faturadasAgg,
    faturadasRows,
    totalProduzidoAgg,
    totalProduzidoRows,
    emCaixaTotal,
    emCaixaRows,
  ] = await Promise.all([
    prisma.serviceOrder.aggregate({
      where: { ...baseMonth, isBilled: false },
      _sum: { totalAmount: true },
    }),
    prisma.serviceOrder.findMany({
      where: { ...baseMonth, isBilled: false },
      select: { id: true, parcelGroupId: true },
    }),
    prisma.serviceOrder.aggregate({
      where: {
        ...baseMonth,
        isBilled: true,
        paymentStatus: { not: "PAGO" },
      },
      _sum: { totalAmount: true },
    }),
    prisma.serviceOrder.findMany({
      where: {
        ...baseMonth,
        isBilled: true,
        paymentStatus: { not: "PAGO" },
      },
      select: { id: true, parcelGroupId: true },
    }),
    prisma.serviceOrder.aggregate({
      where: baseMonth,
      _sum: { totalAmount: true },
    }),
    prisma.serviceOrder.findMany({
      where: baseMonth,
      select: { id: true, parcelGroupId: true },
    }),
    prisma.accountReceivable.aggregate({
      where: {
        companyId,
        ...(unitId ? { unitId } : {}),
        status: "PAGO",
        paidAt: { gte: monthStart, lte: now },
      },
      _sum: { amount: true },
    }),
    prisma.accountReceivable.findMany({
      where: {
        companyId,
        ...(unitId ? { unitId } : {}),
        status: "PAGO",
        paidAt: { gte: monthStart, lte: now },
        serviceOrderId: { not: null },
      },
      select: { serviceOrderId: true },
    }),
  ]);

  const paidOrderIds = Array.from(
    new Set(
      emCaixaRows.map((row) => row.serviceOrderId).filter((id): id is string => Boolean(id)),
    ),
  );
  const paidOrdersForCaixa =
    paidOrderIds.length === 0
      ? []
      : await prisma.serviceOrder.findMany({
          where: { id: { in: paidOrderIds }, companyId },
          select: { id: true, parcelGroupId: true },
        });

  return NextResponse.json({
    coletadas: {
      count: countDistinctLogicalServiceOrders(coletadasRows),
      total: Number(coletadasAgg._sum.totalAmount ?? 0),
    },
    faturadas: {
      count: countDistinctLogicalServiceOrders(faturadasRows),
      total: Number(faturadasAgg._sum.totalAmount ?? 0),
    },
    emCaixa: {
      count: countDistinctLogicalServiceOrders(paidOrdersForCaixa),
      total: Number(emCaixaTotal._sum.amount ?? 0),
    },
    totalProduzido: {
      count: countDistinctLogicalServiceOrders(totalProduzidoRows),
      total: Number(totalProduzidoAgg._sum.totalAmount ?? 0),
    },
  });
}
