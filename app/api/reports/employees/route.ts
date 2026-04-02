import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatReportLocalDate, parseReportDayEnd, parseReportDayStart } from "@/lib/report-dates";

const querySchema = z
  .object({
    employeeId: z.string().min(1).optional(),
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
      employeeId: params.employeeId || undefined,
      unitId: params.unitId || undefined,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Parâmetros inválidos", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const { employeeId, startDate, endDate, unitId } = query;
  const start = parseReportDayStart(startDate);
  const end = parseReportDayEnd(endDate);
  const { companyId } = auth.context;

  if (employeeId) {
    const allowed = await prisma.user.findFirst({
      where: { id: employeeId, companyId },
      select: { id: true },
    });
    if (!allowed) {
      return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });
    }
  }

  const items = await prisma.serviceOrderItem.findMany({
    where: {
      executedByUserId: employeeId ? employeeId : { not: null },
      serviceOrder: {
        companyId,
        openedAt: { gte: start, lte: end },
        ...(unitId ? { unitId } : {}),
      },
    },
    select: {
      laborPrice: true,
      description: true,
      executedByUserId: true,
      serviceOrder: {
        select: { number: true, openedAt: true },
      },
    },
  });

  type Agg = {
    id: string;
    name: string;
    email: string;
    monthlyGoal: number | null;
    totalServices: number;
    totalValue: number;
    services: Array<{ orderNumber: string; date: string; description: string; value: number }>;
  };

  const byUser = new Map<string, Agg>();

  const userIds = new Set<string>();
  for (const item of items) {
    if (item.executedByUserId) {
      userIds.add(item.executedByUserId);
    }
  }

  if (employeeId) {
    userIds.add(employeeId);
  }

  const users = await prisma.user.findMany({
    where: { companyId, id: { in: Array.from(userIds) } },
    select: { id: true, name: true, email: true, monthlyGoal: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  for (const uid of Array.from(userIds)) {
    const u = userMap.get(uid);
    if (!u) {
      continue;
    }
    byUser.set(uid, {
      id: u.id,
      name: u.name,
      email: u.email,
      monthlyGoal: u.monthlyGoal === null ? null : Number(u.monthlyGoal),
      totalServices: 0,
      totalValue: 0,
      services: [],
    });
  }

  for (const item of items) {
    const uid = item.executedByUserId;
    if (!uid) {
      continue;
    }
    let agg = byUser.get(uid);
    if (!agg) {
      const u = userMap.get(uid);
      if (!u) {
        continue;
      }
      agg = {
        id: u.id,
        name: u.name,
        email: u.email,
        monthlyGoal: u.monthlyGoal === null ? null : Number(u.monthlyGoal),
        totalServices: 0,
        totalValue: 0,
        services: [],
      };
      byUser.set(uid, agg);
    }
    const val = Number(item.laborPrice);
    agg.totalServices += 1;
    agg.totalValue += val;
    agg.services.push({
      orderNumber: item.serviceOrder.number,
      date: formatReportLocalDate(new Date(item.serviceOrder.openedAt)),
      description: item.description,
      value: val,
    });
  }

  const employees = Array.from(byUser.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return NextResponse.json({ employees });
}
