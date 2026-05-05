import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatReportLocalDate } from "@/lib/report-dates";
import {
  fecOutstandingFromItems,
  getReferencedOrderNumbersFromFecItems,
} from "@/lib/service-order-reference";

const querySchema = z.object({
  unitId: z.string().min(1).optional(),
});

function customerDisplayName(order: {
  customer: { type: string; fullName: string | null; tradeName: string | null } | null;
  customerNameSnapshot: string | null;
}) {
  if (order.customer) {
    return order.customer.type === "PF" ? order.customer.fullName ?? "-" : order.customer.tradeName ?? "-";
  }
  return order.customerNameSnapshot ?? "Cliente avulso";
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

  const { unitId } = query;
  const { companyId } = auth.context;

  const pendingClosures = await prisma.serviceOrder.findMany({
    where: {
      companyId,
      number: { startsWith: "FEC-" },
      paymentStatus: { not: "PAGO" },
    },
    select: {
      items: { select: { description: true, referencedOrderNumber: true } },
    },
  });

  const referencedNumbers = new Set<string>();
  for (const closure of pendingClosures) {
    for (const number of getReferencedOrderNumbersFromFecItems(closure.items)) {
      referencedNumbers.add(number);
    }
  }

  const excludedSourceIds =
    referencedNumbers.size > 0
      ? (
          await prisma.serviceOrder.findMany({
            where: {
              companyId,
              number: { in: Array.from(referencedNumbers) },
            },
            select: { id: true },
          })
        ).map((o) => o.id)
      : [];

  const orders = await prisma.serviceOrder.findMany({
    where: {
      companyId,
      paymentStatus: { not: "PAGO" },
      status: { not: "CANCELADA" },
      OR: [{ number: { startsWith: "FEC-" } }, { isBilled: true }],
      ...(unitId ? { unitId } : {}),
      ...(excludedSourceIds.length > 0 ? { id: { notIn: excludedSourceIds } } : {}),
    },
    include: {
      customer: {
        select: { type: true, fullName: true, tradeName: true },
      },
      receivables: {
        where: { originType: "SERVICE_ORDER" },
        select: { status: true, amount: true, dueDate: true },
      },
      items: {
        select: { lineTotal: true, description: true },
      },
    },
    orderBy: { openedAt: "desc" },
  });

  type RowType = "NORMAL" | "FECHAMENTO";

  const todayIso = formatReportLocalDate(new Date());

  function computeOpenAmount(order: (typeof orders)[number]): number {
    const pendingRecv = order.receivables
      .filter((r) => r.status === "PENDENTE" || r.status === "VENCIDO")
      .reduce((sum, r) => sum + Number(r.amount), 0);

    if (pendingRecv > 0) {
      return pendingRecv;
    }

    if (order.number.startsWith("FEC-")) {
      return fecOutstandingFromItems(order.items);
    }

    return 0;
  }

  function rowHasOverdueReceivable(order: (typeof orders)[number]): boolean {
    for (const r of order.receivables) {
      if (r.status !== "PENDENTE" && r.status !== "VENCIDO") {
        continue;
      }
      if (r.status === "VENCIDO") {
        return true;
      }
      const dueIso = formatReportLocalDate(new Date(r.dueDate));
      if (dueIso < todayIso) {
        return true;
      }
    }
    return false;
  }

  const mappedWithMeta = orders.map((order) => {
    const isClosing = order.number.startsWith("FEC-");
    const type: RowType = isClosing ? "FECHAMENTO" : "NORMAL";

    const receivableAmount = computeOpenAmount(order);

    const pendingRecvDueDates = order.receivables
      .filter((r) => r.status === "PENDENTE" || r.status === "VENCIDO")
      .map((r) => r.dueDate);
    const earliestDue =
      pendingRecvDueDates.length > 0
        ? new Date(Math.min(...pendingRecvDueDates.map((d) => d.getTime())))
        : null;
    const dueDateStr =
      earliestDue != null
        ? earliestDue.toISOString().slice(0, 10)
        : (order.dueDate?.toISOString().slice(0, 10) ?? null);

    return {
      id: order.id,
      number: order.number,
      type,
      clientName: customerDisplayName(order),
      openedAt: order.openedAt.toISOString().slice(0, 10),
      totalAmount: Number(order.totalAmount),
      receivableAmount,
      dueDate: dueDateStr,
      hasOverdue: rowHasOverdueReceivable(order),
    };
  });

  const mappedFiltered = mappedWithMeta.filter((row) => row.receivableAmount > 0.005);

  const mapped = mappedFiltered.map((row) => {
    const { hasOverdue, ...rest } = row;
    void hasOverdue;
    return rest;
  });

  const summary = {
    total: mappedFiltered.length,
    totalAmount: mappedFiltered.reduce((sum, row) => sum + row.receivableAmount, 0),
    totalVencido: mappedFiltered.filter((row) => row.hasOverdue).length,
    totalFechamento: mappedFiltered.filter((row) => row.type === "FECHAMENTO").length,
  };

  return NextResponse.json({ orders: mapped, summary });
}
