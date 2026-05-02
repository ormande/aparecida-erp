import {
  buildInstallmentsForBilling,
  installmentPlanToJson,
  parseStoredBillingPlan,
  type OrderInstallmentPayload,
} from "@/lib/os-installments";
import { fetchReferencedOrderNumbersInAllClosures } from "@/lib/service-order-reference";
import { fetchReferencedReceivableIdsInAllClosures } from "@/lib/service-order-reference";
import { getAuditPrisma } from "@/lib/prisma-audit";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/services/service-error";
import type { Prisma, ServiceOrderStatus } from "@prisma/client";

type ClosurePayload = {
  customerId: string;
  month: string;
  sourceOrderIds: string[];
  sourceSelections?: Array<{
    orderId: string;
    receivableId?: string | null;
    plannedInstallmentIndex?: number | null;
  }>;
  dueDate?: string | null;
  paymentTerm: "A_VISTA" | "A_PRAZO";
  paymentMethod: string;
  installments?: OrderInstallmentPayload[];
};

type ClosureContext = {
  companyId: string;
  unitId?: string | null;
  userId: string;
};

type ClosureLine = {
  serviceId: string | null;
  description: string;
  referencedOrderNumber: string | null;
  laborPrice: number;
  lineTotal: number;
  originalLineTotal: number;
  quantity: number;
  previousOrderStatus: ServiceOrderStatus;
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

    const selectionRows: Array<{
      orderId: string;
      receivableId?: string | null;
      plannedInstallmentIndex?: number | null;
    }> = payload.sourceSelections?.length
      ? payload.sourceSelections
      : payload.sourceOrderIds.map((orderId) => ({ orderId, receivableId: null }));
    const sourceOrderIds = Array.from(new Set(selectionRows.map((item) => item.orderId)));

    const sourceOrders = await prisma.serviceOrder.findMany({
      where: {
        id: { in: sourceOrderIds },
        companyId: context.companyId,
        ...(context.unitId ? { unitId: context.unitId } : {}),
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
        products: true,
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

    if (sourceOrders.length !== sourceOrderIds.length) {
      throw new ServiceError("Algumas OS selecionadas não pertencem ao cliente/período informado.", 400);
    }

    const notOpen = sourceOrders.filter((o) => {
      if (!o.isBilled) return false;
      return !selectionRows.some((s) => s.orderId === o.id && s.receivableId);
    });
    if (notOpen.length > 0) {
      throw new ServiceError("Só é possível incluir OS ainda não faturadas no fechamento.", 400);
    }

    const lockedInOtherFec = await fetchReferencedOrderNumbersInAllClosures(
      context.companyId,
      context.unitId ?? undefined,
    );
    const lockedReceivableIds = await fetchReferencedReceivableIdsInAllClosures(
      context.companyId,
      context.unitId ?? undefined,
    );
    for (const o of sourceOrders) {
      if (lockedInOtherFec.has(o.number) && !selectionRows.some((s) => s.orderId === o.id && s.receivableId)) {
        throw new ServiceError(
          `A OS ${o.number} já consta em outro fechamento em aberto. Conclua ou reabra aquele fechamento antes de incluir esta OS novamente.`,
          400,
        );
      }
    }
    for (const selection of selectionRows) {
      if (selection.receivableId && lockedReceivableIds.has(selection.receivableId)) {
        throw new ServiceError("Uma ou mais parcelas selecionadas já pertencem a outro fechamento.", 400);
      }
    }

    const closureUnitId = sourceOrders[0].unitId;

    const customerRow = sourceOrders[0].customer;
    const customerName =
      customerRow?.type === "PF" ? customerRow.fullName ?? "Cliente" : customerRow?.tradeName ?? "Cliente";

    const allItems: ClosureLine[] = sourceOrders.flatMap((order): ClosureLine[] => {
      const orderSelections = selectionRows.filter((item) => item.orderId === order.id);
      const selectedReceivableIds = orderSelections
        .map((item) => item.receivableId)
        .filter((v): v is string => Boolean(v));
      if (selectedReceivableIds.length > 0) {
        return order.receivables
          .filter((r) => selectedReceivableIds.includes(r.id))
          .map((r) => ({
            serviceId: null,
            description: `Parcela ${r.installmentNumber ?? 1}/${r.installmentCount ?? 1} da ${order.number} [RCV:${r.id}]`,
            referencedOrderNumber: order.number,
            laborPrice: Number(r.amount),
            lineTotal: Number(r.amount),
            originalLineTotal: Number(r.amount),
            quantity: 1,
            previousOrderStatus: order.status,
          }));
      }

      const plannedIndices = orderSelections
        .map((item) => item.plannedInstallmentIndex)
        .filter((v): v is number => typeof v === "number" && Number.isInteger(v) && !Number.isNaN(v));
      if (plannedIndices.length > 0) {
        if (order.isBilled) {
          throw new ServiceError(
            "Parcelas do plano de abertura só podem ser usadas em OS ainda não faturadas.",
            400,
          );
        }
        const plan = parseStoredBillingPlan(order.billingInstallmentPlan);
        if (!plan || plan.length < 2) {
          throw new ServiceError(`A OS ${order.number} não possui plano de parcelamento válido na abertura.`, 400);
        }
        const uniqueSorted = Array.from(new Set(plannedIndices))
          .filter((i) => i >= 0 && i < plan.length)
          .sort((a, b) => a - b);
        if (uniqueSorted.length === 0) {
          throw new ServiceError("Seleção de parcelas planejadas inválida.", 400);
        }
        return uniqueSorted.map((idx) => {
          const part = plan[idx];
          return {
            serviceId: null,
            description: `Parcela ${idx + 1}/${plan.length} da ${order.number} (planejada)`,
            referencedOrderNumber: null,
            laborPrice: part.amount,
            lineTotal: part.amount,
            originalLineTotal: part.amount,
            quantity: 1,
            previousOrderStatus: order.status,
          };
        });
      }

      const receivable = order.receivables[0];
      const isPaid = receivable?.status === "PAGO";

      const serviceItems: ClosureLine[] = order.items.map((item) => ({
        serviceId: item.serviceId,
        description: isPaid
          ? `${item.description} (referência da ${order.number} - já pago)`
          : `${item.description} (${order.number})`,
        referencedOrderNumber: order.number,
        laborPrice: Number(item.laborPrice),
        lineTotal: isPaid ? 0 : Number(item.lineTotal),
        originalLineTotal: Number(item.lineTotal),
        quantity: item.quantity,
        previousOrderStatus: order.status,
      }));

      const productItems: ClosureLine[] = order.products.map((product) => ({
        serviceId: null,
        description: isPaid
          ? `[Produto] ${product.description} (${order.number} - já pago)`
          : `[Produto] ${product.description} (${order.number})`,
        referencedOrderNumber: order.number,
        laborPrice: Number(product.unitPrice),
        lineTotal: isPaid ? 0 : Number(product.totalPrice),
        originalLineTotal: Number(product.totalPrice),
        quantity: Number(product.quantity),
        previousOrderStatus: order.status,
      }));

      if (serviceItems.length === 0 && productItems.length === 0) {
        return [
          {
            serviceId: null,
            description: `[Sem itens] ${order.number}`,
            referencedOrderNumber: order.number,
            laborPrice: 0,
            lineTotal: 0,
            originalLineTotal: 0,
            quantity: 1,
            previousOrderStatus: order.status,
          },
        ];
      }

      return [...serviceItems, ...productItems];
    });

    const totalSpent = allItems.reduce((sum, item) => sum + item.originalLineTotal, 0);
    const outstandingAmount = allItems.reduce((sum, item) => sum + item.lineTotal, 0);
    if (allItems.length === 0 || totalSpent <= 0) {
      throw new ServiceError("Nenhuma OS/parcela elegível foi selecionada para o fechamento.", 400);
    }
    const closureNumber = await getNextClosureNumber(context.companyId);
    const dueDate =
      payload.paymentTerm === "A_PRAZO" && payload.dueDate ? new Date(`${payload.dueDate}T00:00:00`) : new Date();

    let billingInstallmentPlan: Prisma.InputJsonValue | undefined;
    if (payload.installments && payload.installments.length >= 2) {
      const normalized = buildInstallmentsForBilling(totalSpent, dueDate, payload.installments);
      billingInstallmentPlan = installmentPlanToJson(normalized);
    }

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId ?? undefined,
    });

    const closureOrder = await db.$transaction(async (tx) => {
      const order = await tx.serviceOrder.create({
        data: {
          companyId: context.companyId,
          unitId: closureUnitId,
          customerId: payload.customerId,
          number: closureNumber,
          dueDate,
          paymentTerm: payload.paymentTerm,
          paymentMethod: payload.paymentMethod,
          isBilled: false,
          notes: `Fechamento mensal de ${payload.month} com ${sourceOrders.length} OS de origem.`,
          totalAmount: totalSpent,
          createdByUserId: context.userId,
          updatedByUserId: context.userId,
          ...(billingInstallmentPlan !== undefined ? { billingInstallmentPlan } : {}),
          items: {
            create: allItems.map((item) => ({
              serviceId: item.serviceId ?? null,
              description: item.description,
              referencedOrderNumber: item.referencedOrderNumber,
              quantity: item.quantity,
              laborPrice: item.laborPrice,
              lineTotal: item.lineTotal,
              previousOrderStatus: item.previousOrderStatus,
            })),
          },
        },
      });

      return order;
    });

    return {
      order: {
        id: closureOrder.id,
        number: closureOrder.number,
        clientId: payload.customerId,
        clientName: customerName,
        unitId: closureUnitId,
        unitName: undefined,
        servicesLabel: `Fechamento mensal (${sourceOrders.length} OS)`,
        status: "Aberta",
        paymentStatus: closureOrder.paymentStatus,
        total: totalSpent,
        openedAt: closureOrder.openedAt.toISOString().slice(0, 10),
        dueDate: closureOrder.dueDate?.toISOString().slice(0, 10) ?? null,
        paymentTerm: closureOrder.paymentTerm,
        paymentMethod: closureOrder.paymentMethod ?? "",
        isBilled: false,
        isStandalone: false,
        receivableStatus: null,
      },
    };
  },
};
