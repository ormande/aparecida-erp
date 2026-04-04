import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      items: { select: { description: true } },
    },
  });

  const referencedNumbers = new Set<string>();
  for (const closure of pendingClosures) {
    for (const item of closure.items) {
      const matches = Array.from(item.description.matchAll(/OS-\d{4}-\d{4}/g));
      for (const match of matches) {
        referencedNumbers.add(match[0]);
      }
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
      ...(unitId ? { unitId } : {}),
      ...(excludedSourceIds.length > 0 ? { id: { notIn: excludedSourceIds } } : {}),
    },
    include: {
      unit: { select: { name: true } },
      customer: {
        select: { type: true, fullName: true, tradeName: true },
      },
      receivables: {
        select: { status: true, amount: true, dueDate: true },
      },
    },
    orderBy: { openedAt: "desc" },
  });

  type Reason = "RECEBIVEL_PENDENTE" | "FECHAMENTO_ABERTO" | "FECHAMENTO_PARCIAL";
  type RowType = "NORMAL" | "FECHAMENTO";

  const mapped = orders.map((order) => {
    const isClosing = order.number.startsWith("FEC-");
    const type: RowType = isClosing ? "FECHAMENTO" : "NORMAL";

    const reason: Reason = isClosing
      ? order.paymentStatus === "PAGO_PARCIAL"
        ? "FECHAMENTO_PARCIAL"
        : "FECHAMENTO_ABERTO"
      : "RECEBIVEL_PENDENTE";

    const dueDateStr = order.dueDate?.toISOString().slice(0, 10) ?? null;

    return {
      id: order.id,
      number: order.number,
      type,
      clientName: customerDisplayName(order),
      unitName: order.unit.name,
      openedAt: order.openedAt.toISOString().slice(0, 10),
      totalAmount: Number(order.totalAmount),
      receivableAmount: order.receivables
        .filter((r) => r.status === "PENDENTE" || r.status === "VENCIDO")
        .reduce((sum, r) => sum + Number(r.amount), 0),
      receivableStatus: null,
      dueDate: dueDateStr,
      reason,
    };
  });

  const summary = {
    total: mapped.length,
    totalAmount: mapped.reduce((sum, row) => sum + row.receivableAmount, 0),
    totalVencido: 0,
    totalFechamento: mapped.filter((row) => row.type === "FECHAMENTO").length,
  };

  return NextResponse.json({ orders: mapped, summary });
}
