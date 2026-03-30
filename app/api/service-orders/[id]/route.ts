import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { mapServiceOrderStatus } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

const updateOrderSchema = z.object({
  mode: z.enum(["edit", "settle", "reopen"]),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  unitId: z.string().optional().nullable(),
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
    .optional(),
});

async function getOrder(companyId: string, id: string) {
  return prisma.serviceOrder.findFirst({
    where: {
      id,
      companyId,
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
          brand: true,
          model: true,
        },
      },
      items: {
        select: {
          id: true,
          serviceId: true,
          description: true,
          laborPrice: true,
          lineTotal: true,
        },
      },
      receivables: {
        select: {
          id: true,
          status: true,
          amount: true,
        },
      },
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

function mapOrder(order: NonNullable<Awaited<ReturnType<typeof getOrder>>>) {
  return {
    id: order.id,
    number: order.number,
    clientId: order.customerId,
    clientName: order.customer
      ? order.customer.type === "PF"
        ? order.customer.fullName ?? "-"
        : order.customer.tradeName ?? "-"
      : order.customerNameSnapshot ?? "Cliente avulso",
    customerNameSnapshot: order.customerNameSnapshot,
    unitId: order.unitId,
    unitName: order.unit.name,
    vehicleId: order.vehicleId,
    plate: order.vehicle?.plate ?? "-",
    vehicleLabel: order.vehicle ? `${order.vehicle.plate} • ${order.vehicle.brand} ${order.vehicle.model}` : "-",
    status: mapServiceOrderStatus(order.status),
    total: Number(order.totalAmount),
    openedAt: order.openedAt.toISOString().slice(0, 10),
    dueDate: order.dueDate?.toISOString().slice(0, 10) ?? "",
    paymentTerm: order.paymentTerm,
    paymentMethod: order.paymentMethod ?? "",
    notes: order.notes ?? "",
    mileage: order.mileage ?? null,
    isStandalone: order.isStandalone,
    services: order.items.map((item) => ({
      id: item.id,
      serviceId: item.serviceId,
      description: item.description,
      laborPrice: Number(item.laborPrice),
    })),
    receivableStatus: order.receivables[0]?.status ?? null,
    receivableAmount: order.receivables[0] ? Number(order.receivables[0].amount) : 0,
  };
}

function getReferencedOrderNumbers(descriptions: string[]) {
  const matches = descriptions
    .flatMap((description) => Array.from(description.matchAll(/OS-\d{4}-\d{4}/g)).map((match) => match[0]))
    .filter(Boolean);

  return Array.from(new Set(matches));
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const order = await getOrder(session.user.companyId, params.id);

  if (!order) {
    return NextResponse.json({ message: "Ordem de serviço não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ order: mapOrder(order) });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = updateOrderSchema.parse(await request.json());
  const existing = await getOrder(session.user.companyId, params.id);

  if (!existing) {
    return NextResponse.json({ message: "Ordem de serviço não encontrada." }, { status: 404 });
  }

  if (payload.mode === "edit") {
    const services = payload.services ?? [];
    const totalAmount = services.reduce((sum, item) => sum + Number(item.laborPrice), 0);
    const paymentTerm = payload.paymentTerm ?? existing.paymentTerm ?? "A_VISTA";
    const dueDate =
      paymentTerm === "A_PRAZO" && payload.dueDate
        ? new Date(`${payload.dueDate}T00:00:00`)
        : new Date();

    const updated = await prisma.$transaction(async (tx) => {
      await tx.serviceOrderItem.deleteMany({
        where: {
          serviceOrderId: existing.id,
        },
      });

      const order = await tx.serviceOrder.update({
        where: {
          id: existing.id,
        },
        data: {
          customerId: payload.customerId || null,
          unitId: payload.unitId || existing.unitId,
          customerNameSnapshot: payload.customerId ? null : payload.customerNameSnapshot || "Cliente avulso",
          vehicleId: payload.vehicleId || null,
          mileage: payload.mileage ?? null,
          dueDate,
          paymentTerm,
          paymentMethod: payload.paymentMethod || null,
          notes: payload.notes || null,
          isStandalone: !payload.customerId,
          totalAmount,
          updatedByUserId: session.user.id,
          items: {
            create: services.map((service) => ({
              serviceId: service.serviceId || null,
              description: service.description,
              laborPrice: service.laborPrice,
              lineTotal: service.laborPrice,
            })),
          },
        },
        include: {
          unit: {
            select: {
              id: true,
              name: true,
            },
          },
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
              brand: true,
              model: true,
            },
          },
          items: {
            select: {
              id: true,
              serviceId: true,
              description: true,
              laborPrice: true,
              lineTotal: true,
            },
          },
          receivables: {
            select: {
              id: true,
              status: true,
              amount: true,
            },
          },
        },
      });

      await tx.accountReceivable.updateMany({
        where: {
          serviceOrderId: existing.id,
          originType: "SERVICE_ORDER",
        },
        data: {
          customerId: payload.customerId || null,
          unitId: payload.unitId || existing.unitId,
          amount: totalAmount,
          dueDate,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: session.user.companyId,
          unitId: payload.unitId || order.unitId,
          userId: session.user.id,
          entityType: "service_order",
          entityId: order.id,
          action: "UPDATE",
          beforeData: {
            number: existing.number,
            totalAmount: Number(existing.totalAmount),
            status: existing.status,
          },
          afterData: {
            number: order.number,
            totalAmount: Number(order.totalAmount),
            status: order.status,
            paymentTerm: order.paymentTerm,
            dueDate: order.dueDate?.toISOString(),
            sourceModule: "service_orders_edit",
          },
        },
      });

      return order;
    });

    return NextResponse.json({ order: mapOrder(updated) });
  }

  const receivable = existing.receivables[0];
  if (!receivable) {
    return NextResponse.json({ message: "Recebível vinculado não encontrado." }, { status: 404 });
  }

  const targetStatus = payload.mode === "settle" ? "PAGO" : "PENDENTE";
  const orderStatus = payload.mode === "settle" ? "CONCLUIDA" : existing.status === "CONCLUIDA" ? "ABERTA" : existing.status;
  const closureOutstandingAmount = existing.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
  const appliedDiscount =
    existing.number.startsWith("FEC-") && payload.mode === "settle"
      ? Math.min(payload.discountAmount ?? 0, closureOutstandingAmount)
      : 0;
  const closureSettledAmount = Math.max(closureOutstandingAmount - appliedDiscount, 0);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.accountReceivable.update({
      where: {
        id: receivable.id,
      },
      data: {
        amount:
          existing.number.startsWith("FEC-")
            ? payload.mode === "settle"
              ? closureSettledAmount
              : closureOutstandingAmount
            : receivable.amount,
        status: targetStatus,
        paidAt: payload.mode === "settle" ? new Date() : null,
      },
    });

    if (existing.number.startsWith("FEC-")) {
      const sourceNumbers = getReferencedOrderNumbers(existing.items.map((item) => item.description));
      const reopenableSourceNumbers = getReferencedOrderNumbers(
        existing.items.filter((item) => !item.description.includes("já pago")).map((item) => item.description),
      );
      const effectiveSourceNumbers = payload.mode === "reopen" ? reopenableSourceNumbers : sourceNumbers;

      if (effectiveSourceNumbers.length) {
        const sourceOrders = await tx.serviceOrder.findMany({
          where: {
            companyId: session.user.companyId,
            number: {
              in: effectiveSourceNumbers,
            },
          },
          select: {
            id: true,
            unitId: true,
            number: true,
            status: true,
            receivables: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

        const sourceOrderIds = sourceOrders.map((order) => order.id);
        const sourceReceivableIds = sourceOrders.flatMap((order) => order.receivables.map((item) => item.id));

        if (sourceReceivableIds.length) {
          await tx.accountReceivable.updateMany({
            where: {
              id: {
                in: sourceReceivableIds,
              },
            },
            data: {
              status: targetStatus,
              paidAt: payload.mode === "settle" ? new Date() : null,
            },
          });
        }

        if (sourceOrderIds.length) {
          await tx.serviceOrder.updateMany({
            where: {
              id: {
                in: sourceOrderIds,
              },
            },
            data: {
              status: orderStatus,
              closedAt: payload.mode === "settle" ? new Date() : null,
              updatedByUserId: session.user.id,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            companyId: session.user.companyId,
            unitId: existing.unitId,
            userId: session.user.id,
            entityType: "service_order",
            entityId: existing.id,
            action: "STATUS_CHANGE",
            beforeData: {
              sourceOrders,
            },
            afterData: {
              sourceModule: payload.mode === "settle" ? "closure_settle_sync" : "closure_reopen_sync",
              targetStatus,
              sourceNumbers: effectiveSourceNumbers,
              discountAmount: appliedDiscount,
            },
          },
        });
      }
    }

    const order = await tx.serviceOrder.update({
      where: {
        id: existing.id,
      },
      data: {
        status: orderStatus,
        updatedByUserId: session.user.id,
        closedAt: payload.mode === "settle" ? new Date() : null,
      },
      include: {
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
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
            brand: true,
            model: true,
          },
        },
        items: {
          select: {
            id: true,
            serviceId: true,
            description: true,
            laborPrice: true,
            lineTotal: true,
          },
        },
        receivables: {
          select: {
            id: true,
            status: true,
            amount: true,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: session.user.companyId,
        unitId: order.unitId,
        userId: session.user.id,
        entityType: "service_order",
        entityId: order.id,
        action: "STATUS_CHANGE",
        beforeData: {
          status: existing.status,
          receivableStatus: receivable.status,
        },
        afterData: {
          status: order.status,
          receivableStatus: targetStatus,
          receivableAmount:
            existing.number.startsWith("FEC-")
              ? payload.mode === "settle"
                ? closureSettledAmount
                : closureOutstandingAmount
              : Number(receivable.amount),
          discountAmount: appliedDiscount,
          sourceModule: payload.mode === "settle" ? "service_orders_settle" : "service_orders_reopen",
        },
      },
    });

    return order;
  });

  return NextResponse.json({ order: mapOrder(updated) });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const existing = await getOrder(session.user.companyId, params.id);

  if (!existing) {
    return NextResponse.json({ message: "Ordem de serviço não encontrada." }, { status: 404 });
  }

  const hasPaidReceivable = existing.receivables.some((item) => item.status === "PAGO");
  if (hasPaidReceivable) {
    return NextResponse.json(
      { message: "Não é possível excluir uma OS com recebimento já baixado." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.accountReceivable.deleteMany({
      where: {
        serviceOrderId: existing.id,
      },
    });

    await tx.serviceOrder.delete({
      where: {
        id: existing.id,
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: session.user.companyId,
        unitId: existing.unitId,
        userId: session.user.id,
        entityType: "service_order",
        entityId: existing.id,
        action: "DELETE",
        beforeData: {
          number: existing.number,
          totalAmount: Number(existing.totalAmount),
          status: existing.status,
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
