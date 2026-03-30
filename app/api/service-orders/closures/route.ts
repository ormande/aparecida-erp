import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const closureSchema = z.object({
  customerId: z.string().min(1),
  unitId: z.string().optional().nullable(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  dueDate: z.string().optional().nullable(),
  paymentTerm: z.enum(["A_VISTA", "A_PRAZO"]).default("A_PRAZO"),
  paymentMethod: z.string().default("Fechamento mensal"),
});

function buildClosureNumber(year: number, sequence: number) {
  return `FEC-${year}-${String(sequence).padStart(4, "0")}`;
}

async function getNextClosureNumber(companyId: string) {
  const currentYear = new Date().getFullYear();
  const orders = await prisma.serviceOrder.findMany({
    where: {
      companyId,
      number: {
        startsWith: `FEC-${currentYear}-`,
      },
    },
    select: {
      number: true,
    },
    orderBy: {
      number: "asc",
    },
  });

  const used = new Set(
    orders
      .map((order) => Number(order.number.split("-").at(-1)))
      .filter((value) => Number.isFinite(value) && value > 0),
  );

  let next = 1;
  while (used.has(next)) {
    next += 1;
  }

  return buildClosureNumber(currentYear, next);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = closureSchema.parse(await request.json());
  const [year, month] = payload.month.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const sourceOrders = await prisma.serviceOrder.findMany({
    where: {
      companyId: session.user.companyId,
      customerId: payload.customerId,
      openedAt: {
        gte: start,
        lt: end,
      },
      NOT: {
        number: {
          startsWith: "FEC-",
        },
      },
      ...(payload.unitId ? { unitId: payload.unitId } : {}),
    },
    include: {
      items: true,
      receivables: true,
      customer: {
        select: {
          type: true,
          fullName: true,
          tradeName: true,
        },
      },
    },
    orderBy: {
      openedAt: "asc",
    },
  });

  if (!sourceOrders.length) {
    return NextResponse.json({ message: "Nenhuma OS encontrada para gerar fechamento." }, { status: 400 });
  }

  const referenceUnitId = payload.unitId ?? sourceOrders[0].unitId;
  const customer = sourceOrders[0].customer;
  const customerName =
    customer?.type === "PF"
      ? customer.fullName ?? "Cliente"
      : customer?.tradeName ?? "Cliente";

  const allItems = sourceOrders.flatMap((order) => {
    const receivable = order.receivables[0];
    const isPaid = receivable?.status === "PAGO";

    return order.items.map((item) => ({
      serviceId: item.serviceId,
      description: isPaid
        ? `${item.description} (referência da ${order.number} - já pago)`
        : `${item.description} (${order.number})`,
      laborPrice: Number(item.laborPrice),
      lineTotal: isPaid ? 0 : Number(item.lineTotal),
      originalLineTotal: Number(item.lineTotal),
      quantity: item.quantity,
      paidReference: isPaid,
    }));
  });

  const totalSpent = allItems.reduce((sum, item) => sum + item.originalLineTotal, 0);
  const outstandingAmount = allItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const closureNumber = await getNextClosureNumber(session.user.companyId);
  const dueDate =
    payload.paymentTerm === "A_PRAZO" && payload.dueDate
      ? new Date(`${payload.dueDate}T00:00:00`)
      : new Date();

  const closureOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.serviceOrder.create({
      data: {
        companyId: session.user.companyId,
        unitId: referenceUnitId,
        customerId: payload.customerId,
        number: closureNumber,
        dueDate,
        paymentTerm: payload.paymentTerm,
        paymentMethod: payload.paymentMethod,
        notes: `Fechamento mensal de ${payload.month} com ${sourceOrders.length} OS de origem.`,
        totalAmount: totalSpent,
        createdByUserId: session.user.id,
        updatedByUserId: session.user.id,
        items: {
          create: allItems.map((item) => ({
            serviceId: item.serviceId ?? null,
            description: item.description,
            quantity: item.quantity,
            laborPrice: item.laborPrice,
            lineTotal: item.lineTotal,
          })),
        },
      },
    });

    if (outstandingAmount > 0) {
      await tx.accountReceivable.create({
        data: {
          companyId: session.user.companyId,
          unitId: referenceUnitId,
          customerId: payload.customerId,
          serviceOrderId: order.id,
          originType: "SERVICE_ORDER",
          description: order.number,
          amount: outstandingAmount,
          dueDate,
          status: "PENDENTE",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        companyId: session.user.companyId,
        unitId: referenceUnitId,
        userId: session.user.id,
        entityType: "service_order",
        entityId: order.id,
        action: "CREATE",
        afterData: {
          number: order.number,
          sourceModule: "service_orders_closure",
          sourceOrders: sourceOrders.map((sourceOrder) => sourceOrder.number),
          totalSpent,
          outstandingAmount,
        },
      },
    });

    return order;
  });

  return NextResponse.json({
    order: {
      id: closureOrder.id,
      number: closureOrder.number,
      clientId: payload.customerId,
      clientName: customerName,
      plate: "-",
      unitId: referenceUnitId,
      unitName: payload.unitId ? undefined : undefined,
      servicesLabel: `Fechamento mensal (${sourceOrders.length} OS)`,
      status: "Aberta",
      total: totalSpent,
      openedAt: closureOrder.openedAt.toISOString().slice(0, 10),
      dueDate: closureOrder.dueDate?.toISOString().slice(0, 10) ?? null,
      paymentTerm: closureOrder.paymentTerm,
      paymentMethod: closureOrder.paymentMethod ?? "",
      isStandalone: false,
      receivableStatus: outstandingAmount > 0 ? "PENDENTE" : "PAGO",
    },
  });
}
