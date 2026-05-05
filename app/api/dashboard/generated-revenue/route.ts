import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { assertUnitAccess, getRequiredSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatReportLocalDate } from "@/lib/report-dates";

const querySchema = z.object({
  unitId: z.string().min(1).optional(),
  days: z.coerce.number().int().min(1).max(31).optional().default(7),
});

export async function GET(request: NextRequest) {
  const auth = await getRequiredSessionContext({
    allowedRoles: ["PROPRIETARIO", "GESTOR", "FUNCIONARIO"],
  });
  if (!auth.ok) {
    return auth.response;
  }

  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  let query: z.infer<typeof querySchema>;
  try {
    query = querySchema.parse({
      ...raw,
      unitId: raw.unitId || undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const { unitId, days } = query;

  if (unitId) {
    const denied = assertUnitAccess(auth.context.units, unitId);
    if (denied) {
      return denied;
    }
  }

  const { companyId } = auth.context;

  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const orders = await prisma.serviceOrder.findMany({
    where: {
      companyId,
      ...(unitId ? { unitId } : {}),
      openedAt: { gte: start, lte: end },
      status: { not: "CANCELADA" },
      NOT: { number: { startsWith: "FEC-" } },
    },
    select: {
      openedAt: true,
      totalAmount: true,
    },
  });

  const sumsByDay = new Map<string, number>();
  for (const o of orders) {
    const key = formatReportLocalDate(new Date(o.openedAt));
    sumsByDay.set(key, (sumsByDay.get(key) ?? 0) + Number(o.totalAmount));
  }

  const series: Array<{ date: string; dayLabel: string; total: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = formatReportLocalDate(d);
    const dayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d);
    series.push({
      date: dateKey,
      dayLabel,
      total: sumsByDay.get(dateKey) ?? 0,
    });
  }

  return NextResponse.json({ series });
}
