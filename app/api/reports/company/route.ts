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
import {
  countLogicalFullyBilledServiceOrders,
  LOGICAL_SERVICE_ORDER_ROOT,
} from "@/lib/service-order-stats";

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
  const generatedRevenueFilter = {
    companyId,
    openedAt: { gte: start, lte: end },
    NOT: { number: { startsWith: "FEC-" } },
    ...unitFilter,
  };

  const [generatedRevenueAgg, receivablePending, payablePending, ordersOpened, generatedRows, units] =
    await Promise.all([
      prisma.serviceOrder.aggregate({
        where: generatedRevenueFilter,
        _sum: { totalAmount: true },
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
          ...generatedRevenueFilter,
          ...LOGICAL_SERVICE_ORDER_ROOT,
        },
      }),
      prisma.serviceOrder.findMany({
        where: generatedRevenueFilter,
        select: { openedAt: true, totalAmount: true },
      }),
      prisma.unit.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const ordersConcluded = await countLogicalFullyBilledServiceOrders(generatedRevenueFilter);

  const revenueByDayMap = new Map<string, number>();
  for (const key of iterDaysInclusive(startDate, endDate)) {
    revenueByDayMap.set(key, 0);
  }
  for (const row of generatedRows) {
    const key = formatReportLocalDate(new Date(row.openedAt));
    if (revenueByDayMap.has(key)) {
      revenueByDayMap.set(key, (revenueByDayMap.get(key) ?? 0) + Number(row.totalAmount));
    }
  }
  const revenueByDay = Array.from(revenueByDayMap.entries()).map(([date, value]) => ({ date, value }));

  const unitsToBreakdown = unitId ? units.filter((u) => u.id === unitId) : units;

  const byUnit = await Promise.all(
    unitsToBreakdown.map(async (u) => {
      const unitBase = {
        companyId,
        unitId: u.id,
        openedAt: { gte: start, lte: end },
        NOT: { number: { startsWith: "FEC-" } },
      } as const;

      const [rev, opened, concluded] = await Promise.all([
        prisma.serviceOrder.aggregate({
          where: unitBase,
          _sum: { totalAmount: true },
        }),
        prisma.serviceOrder.count({
          where: {
            ...unitBase,
            ...LOGICAL_SERVICE_ORDER_ROOT,
          },
        }),
        countLogicalFullyBilledServiceOrders(unitBase),
      ]);
      return {
        unitName: u.name,
        revenue: Number(rev._sum.totalAmount ?? 0),
        ordersOpened: opened,
        ordersConcluded: concluded,
      };
    }),
  );

  return NextResponse.json({
    totalRevenue: Number(generatedRevenueAgg._sum.totalAmount ?? 0),
    totalReceivable: Number(receivablePending._sum.amount ?? 0),
    totalPayable: Number(payablePending._sum.amount ?? 0),
    ordersOpened,
    ordersConcluded,
    byUnit,
    revenueByDay,
  });
}
