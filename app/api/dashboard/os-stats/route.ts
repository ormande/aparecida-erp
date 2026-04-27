import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const [coletadas, faturadas, totalProduzido, emCaixaTotal, emCaixaRows] = await Promise.all([
    prisma.serviceOrder.aggregate({
      where: {
        companyId,
        ...unitFilter,
        openedAt: { gte: monthStart, lte: now },
        status: { not: "CANCELADA" },
        isBilled: false,
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.serviceOrder.aggregate({
      where: {
        companyId,
        ...unitFilter,
        openedAt: { gte: monthStart, lte: now },
        status: { not: "CANCELADA" },
        isBilled: true,
        paymentStatus: { not: "PAGO" },
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
    prisma.serviceOrder.aggregate({
      where: {
        companyId,
        ...unitFilter,
        openedAt: { gte: monthStart, lte: now },
        status: { not: "CANCELADA" },
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
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

  return NextResponse.json({
    coletadas: {
      count: coletadas._count._all,
      total: Number(coletadas._sum.totalAmount ?? 0),
    },
    faturadas: {
      count: faturadas._count._all,
      total: Number(faturadas._sum.totalAmount ?? 0),
    },
    emCaixa: {
      count: new Set(emCaixaRows.map((row) => row.serviceOrderId).filter(Boolean)).size,
      total: Number(emCaixaTotal._sum.amount ?? 0),
    },
    totalProduzido: {
      count: totalProduzido._count._all,
      total: Number(totalProduzido._sum.totalAmount ?? 0),
    },
  });
}
