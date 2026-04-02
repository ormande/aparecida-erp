import { getAuditPrisma } from "@/lib/prisma-audit";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/services/service-error";

type ClosurePayload = {
  customerId: string;
  month: string;
  dueDate?: string | null;
  paymentTerm: "A_VISTA" | "A_PRAZO";
  paymentMethod: string;
};

type ClosureContext = {
  companyId: string;
  unitId: string;
  userId: string;
};

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

export const closureService = {
  async create(payload: ClosurePayload, context: ClosureContext) {
    const customer = await prisma.customer.findFirst({
      where: { id: payload.customerId, companyId: context.companyId },
      select: { id: true },
    });

    if (!customer) {
      throw new ServiceError("Cliente não encontrado.", 404);
    }

    const [year, month] = payload.month.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    const sourceOrders = await prisma.serviceOrder.findMany({
      where: {
        companyId: context.companyId,
        unitId: context.unitId,
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
      throw new ServiceError("Nenhuma OS encontrada para gerar fechamento.", 400);
    }

    const customerRow = sourceOrders[0].customer;
    const customerName =
      customerRow?.type === "PF" ? customerRow.fullName ?? "Cliente" : customerRow?.tradeName ?? "Cliente";

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
        previousOrderStatus: order.status,
      }));
    });

    const totalSpent = allItems.reduce((sum, item) => sum + item.originalLineTotal, 0);
    const outstandingAmount = allItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const closureNumber = await getNextClosureNumber(context.companyId);
    const dueDate =
      payload.paymentTerm === "A_PRAZO" && payload.dueDate ? new Date(`${payload.dueDate}T00:00:00`) : new Date();

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    const closureOrder = await db.$transaction(async (tx) => {
      const order = await tx.serviceOrder.create({
        data: {
          companyId: context.companyId,
          unitId: context.unitId,
          customerId: payload.customerId,
          number: closureNumber,
          dueDate,
          paymentTerm: payload.paymentTerm,
          paymentMethod: payload.paymentMethod,
          notes: `Fechamento mensal de ${payload.month} com ${sourceOrders.length} OS de origem.`,
          totalAmount: totalSpent,
          createdByUserId: context.userId,
          updatedByUserId: context.userId,
          items: {
            create: allItems.map((item) => ({
              serviceId: item.serviceId ?? null,
              description: item.description,
              quantity: item.quantity,
              laborPrice: item.laborPrice,
              lineTotal: item.lineTotal,
              previousOrderStatus: item.previousOrderStatus,
            })),
          },
        },
      });

      if (outstandingAmount > 0) {
        await tx.accountReceivable.create({
          data: {
            companyId: context.companyId,
            unitId: context.unitId,
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

      return order;
    });

    return {
      order: {
        id: closureOrder.id,
        number: closureOrder.number,
        clientId: payload.customerId,
        clientName: customerName,
        plate: "-",
        unitId: context.unitId,
        unitName: undefined,
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
    };
  },
};
