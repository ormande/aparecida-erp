import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatReportLocalDate,
  iterDaysInclusive,
  parseReportDayEnd,
  parseReportDayStart,
} from "@/lib/report-dates";

const querySchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    unitId: z.string().min(1).optional(),
  })
  .refine((q) => q.startDate <= q.endDate, { message: "startDate deve ser anterior ou igual a endDate." });

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
      ...params,
      unitId: params.unitId || undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const { startDate, endDate, unitId } = query;
  const start = parseReportDayStart(startDate);
  const end = parseReportDayEnd(endDate);
  const { companyId } = auth.context;

  const unitFilter = unitId ? { unitId } : {};

  const [revenueAgg, receivablePending, payablePending, ordersOpened, ordersConcluded, paidRows, units] =
    await Promise.all([
      prisma.accountReceivable.aggregate({
        where: {
          companyId,
          status: "PAGO",
          paidAt: { gte: start, lte: end },
          ...(unitId ? { unitId } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.accountReceivable.aggregate({
        where: {
          companyId,
          status: { in: ["PENDENTE", "VENCIDO"] },
          dueDate: { gte: start, lte: end },
          ...(unitId ? { unitId } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.accountPayable.aggregate({
        where: {
          companyId,
          status: { in: ["PENDENTE", "VENCIDO"] },
          dueDate: { gte: start, lte: end },
          ...(unitId ? { unitId } : {}),
        },
        _sum: { amount: true },
      }),
      prisma.serviceOrder.count({
        where: {
          companyId,
          openedAt: { gte: start, lte: end },
          ...unitFilter,
        },
      }),
      prisma.serviceOrder.count({
        where: {
          companyId,
          status: "CONCLUIDA",
          closedAt: { gte: start, lte: end },
          ...unitFilter,
        },
      }),
      prisma.accountReceivable.findMany({
        where: {
          companyId,
          status: "PAGO",
          paidAt: { gte: start, lte: end },
          ...(unitId ? { unitId } : {}),
        },
        select: { paidAt: true, amount: true },
      }),
      prisma.unit.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const revenueByDayMap = new Map<string, number>();
  for (const key of iterDaysInclusive(startDate, endDate)) {
    revenueByDayMap.set(key, 0);
  }
  for (const row of paidRows) {
    if (!row.paidAt) {
      continue;
    }
    const key = formatReportLocalDate(new Date(row.paidAt));
    if (revenueByDayMap.has(key)) {
      revenueByDayMap.set(key, (revenueByDayMap.get(key) ?? 0) + Number(row.amount));
    }
  }
  const revenueByDay = Array.from(revenueByDayMap.entries()).map(([date, value]) => ({ date, value }));

  const unitsToBreakdown = unitId ? units.filter((u) => u.id === unitId) : units;

  const byUnit = await Promise.all(
    unitsToBreakdown.map(async (u) => {
      const [rev, opened, concluded] = await Promise.all([
        prisma.accountReceivable.aggregate({
          where: {
            companyId,
            unitId: u.id,
            status: "PAGO",
            paidAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        prisma.serviceOrder.count({
          where: { companyId, unitId: u.id, openedAt: { gte: start, lte: end } },
        }),
        prisma.serviceOrder.count({
          where: {
            companyId,
            unitId: u.id,
            status: "CONCLUIDA",
            closedAt: { gte: start, lte: end },
          },
        }),
      ]);
      return {
        unitName: u.name,
        revenue: Number(rev._sum.amount ?? 0),
        ordersOpened: opened,
        ordersConcluded: concluded,
      };
    }),
  );

  return NextResponse.json({
    totalRevenue: Number(revenueAgg._sum.amount ?? 0),
    totalReceivable: Number(receivablePending._sum.amount ?? 0),
    totalPayable: Number(payablePending._sum.amount ?? 0),
    ordersOpened,
    ordersConcluded,
    byUnit,
    revenueByDay,
  });
}
