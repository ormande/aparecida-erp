import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { mapServiceOrderStatus } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

const orderSchema = z.object({
  unitId: z.string().min(1),
  customerId: z.string().optional().nullable(),
  customerNameSnapshot: z.string().optional().default(""),
  vehicleId: z.string().optional().nullable(),
  mileage: z.coerce.number().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  paymentTerm: z.enum(["A_VISTA", "A_PRAZO"]).optional().nullable(),
  paymentMethod: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  services: z
    .array(
      z.object({
        serviceId: z.string().optional().nullable(),
        description: z.string().min(1),
        laborPrice: z.coerce.number().min(0),
      }),
    )
    .min(1),
});

function buildOrderNumber(year: number, sequence: number) {
  return `OS-${year}-${String(sequence).padStart(4, "0")}`;
}

async function getNextOrderNumber(companyId: string) {
  const currentYear = new Date().getFullYear();
  const orders = await prisma.serviceOrder.findMany({
    where: {
      companyId,
      number: {
        startsWith: `OS-${currentYear}-`,
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

  return buildOrderNumber(currentYear, next);
}

function getCustomerDisplayName(order: {
  customer: { type: "PF" | "PJ"; fullName: string | null; tradeName: string | null } | null;
  customerNameSnapshot: string | null;
}) {
  if (order.customer) {
    return order.customer.type === "PF" ? order.customer.fullName ?? "-" : order.customer.tradeName ?? "-";
  }

  return order.customerNameSnapshot ?? "Cliente avulso";
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get("vehicleId");
  const customerId = searchParams.get("customerId");
  const unitId = searchParams.get("unitId");

  const orders = await prisma.serviceOrder.findMany({
    where: {
      companyId: session.user.companyId,
      unitId: unitId || undefined,
      vehicleId: vehicleId || undefined,
      customerId: customerId || undefined,
    },
    orderBy: {
      openedAt: "desc",
    },
    include: {
      customer: {
        select: {
          type: true,
          fullName: true,
          tradeName: true,
        },
      },
      vehicle: {
        select: {
          plate: true,
        },
      },
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        select: {
          description: true,
        },
      },
      receivables: {
        select: {
          status: true,
        },
      },
    },
  });

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      number: order.number,
      clientId: order.customerId,
      vehicleId: order.vehicleId,
      clientName: getCustomerDisplayName(order),
      plate: order.vehicle?.plate ?? "-",
      unitId: order.unitId,
      unitName: order.unit.name,
      servicesLabel: order.items.map((service) => service.description).join(", "),
      status: mapServiceOrderStatus(order.status),
      total: Number(order.totalAmount),
      openedAt: order.openedAt.toISOString().slice(0, 10),
      dueDate: order.dueDate?.toISOString().slice(0, 10) ?? null,
      paymentTerm: order.paymentTerm,
      paymentMethod: order.paymentMethod ?? "",
      isStandalone: order.isStandalone,
      receivableStatus: order.receivables[0]?.status ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = orderSchema.parse(await request.json());
  const totalAmount = payload.services.reduce((sum, item) => sum + Number(item.laborPrice), 0);
  const number = await getNextOrderNumber(session.user.companyId);
  const paymentTerm = payload.paymentTerm ?? "A_VISTA";
  const dueDate =
    paymentTerm === "A_PRAZO" && payload.dueDate
      ? new Date(`${payload.dueDate}T00:00:00`)
      : new Date();

  const order = await prisma.serviceOrder.create({
    data: {
      companyId: session.user.companyId,
      unitId: payload.unitId,
      customerId: payload.customerId || null,
      customerNameSnapshot: payload.customerId ? null : payload.customerNameSnapshot || "Cliente avulso",
      vehicleId: payload.vehicleId || null,
      number,
      mileage: payload.mileage ?? null,
      dueDate,
      paymentTerm,
      paymentMethod: payload.paymentMethod || null,
      notes: payload.notes || null,
      isStandalone: !payload.customerId,
      totalAmount,
      createdByUserId: session.user.id,
      updatedByUserId: session.user.id,
      items: {
        create: payload.services.map((service) => ({
          serviceId: service.serviceId || null,
          description: service.description,
          laborPrice: service.laborPrice,
          lineTotal: service.laborPrice,
        })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId,
      unitId: payload.unitId,
      userId: session.user.id,
      entityType: "service_order",
      entityId: order.id,
      action: "CREATE",
      afterData: {
        number: order.number,
        customerId: order.customerId,
        customerNameSnapshot: order.customerNameSnapshot,
        vehicleId: order.vehicleId,
        totalAmount: Number(order.totalAmount),
        dueDate: order.dueDate?.toISOString(),
        paymentTerm: order.paymentTerm,
        sourceModule: "service_orders",
        originType: "SERVICE_ORDER",
      },
    },
  });

  await prisma.accountReceivable.create({
    data: {
      companyId: session.user.companyId,
      unitId: payload.unitId,
      customerId: payload.customerId || null,
      serviceOrderId: order.id,
      originType: "SERVICE_ORDER",
      description: order.number,
      amount: totalAmount,
      dueDate,
      status: "PENDENTE",
      installmentGroupId: null,
      installmentNumber: null,
      installmentCount: null,
    },
  });

  return NextResponse.json({ orderId: order.id, number: order.number }, { status: 201 });
}
