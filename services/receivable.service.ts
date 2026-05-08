import { randomUUID } from "crypto";

import type { Prisma } from "@prisma/client";

import { mapReceivableToAppReceivable } from "@/lib/db-mappers";
import { parcelColumnLabel } from "@/lib/receivable-display";
import {
  extractReceivableIdsFromText,
  getReferencedOrderNumbersFromFecItems,
} from "@/lib/service-order-reference";
import { getAuditPrisma } from "@/lib/prisma-audit";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/services/service-error";

type ReceivableCreatePayload = {
  description: string;
  customerId: string;
  amount: number;
  dueDate: string;
  installments: number;
};

type ReceivableUpdatePayload = {
  mode: "edit" | "settle" | "reopen";
  description?: string;
  customerId?: string;
  amount?: number;
  dueDate?: string;
  partialAmount?: number;
  paymentMethod?: string;
};

type ReceivableContext = {
  companyId: string;
  unitId?: string | null;
  userId: string;
};

type ServiceOrderReceivableRow = {
  status: "PAGO" | "PENDENTE" | "VENCIDO";
};

function paymentStatusFromReceivables(receivables: ServiceOrderReceivableRow[]) {
  const hasReceivables = receivables.length > 0;
  const allPaid = hasReceivables && receivables.every((item) => item.status === "PAGO");
  const hasPaid = receivables.some((item) => item.status === "PAGO");

  return {
    allPaid,
    paymentStatus: allPaid ? "PAGO" : hasPaid ? "PAGO_PARCIAL" : "PENDENTE",
  } as const;
}

function addMonths(base: Date, months: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

function mapReceivableForResponse(
  receivable: Awaited<ReturnType<typeof prisma.accountReceivable.findFirstOrThrow>> & {
    customer?: {
      type: "PF" | "PJ";
      fullName: string | null;
      tradeName: string | null;
    } | null;
    unit?: {
      name: string;
    } | null;
    serviceOrder?: {
      number: string;
      parcelIndex: number | null;
      parcelCount: number | null;
    } | null;
  },
) {
  return {
    ...mapReceivableToAppReceivable(receivable),
    clientName: receivable.customer
      ? receivable.customer.type === "PF"
        ? receivable.customer.fullName ?? "-"
        : receivable.customer.tradeName ?? "-"
      : "-",
    unitName: receivable.unit?.name ?? "Geral",
    parcelDisplay: parcelColumnLabel({
      originType: receivable.originType,
      installmentNumber: receivable.installmentNumber,
      installmentCount: receivable.installmentCount,
      serviceOrder: receivable.serviceOrder ?? undefined,
    }),
  };
}

async function ensureCustomerExists(companyId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
    select: { id: true },
  });

  if (!customer) {
    throw new ServiceError("Cliente não encontrado.", 404);
  }
}

export const receivableService = {
  async list(
    filters: { status?: string | null; period?: string | null; unitId?: string | null },
    context: Pick<ReceivableContext, "companyId">,
  ) {
    let periodDueDateRange: { gte: Date; lt: Date } | undefined;
    if (filters.period) {
      const start = new Date(`${filters.period}-01T00:00:00`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      periodDueDateRange = { gte: start, lt: end };
    }

    /** Todos os títulos da empresa (manual + faturamento de OS); sem filtros extras de negócio. */
    const [receivables, billedClosures] = await Promise.all([
      prisma.accountReceivable.findMany({
        where: {
          companyId: context.companyId,
          ...(filters.unitId ? { unitId: filters.unitId } : {}),
          status:
            filters.status === "Pago"
              ? "PAGO"
              : filters.status === "Vencido"
                ? "VENCIDO"
                : filters.status === "Pendente"
                  ? "PENDENTE"
                  : undefined,
          ...(periodDueDateRange ? { dueDate: periodDueDateRange } : {}),
        },
        include: {
          customer: {
            select: {
              type: true,
              fullName: true,
              tradeName: true,
            },
          },
          unit: {
            select: {
              name: true,
            },
          },
          serviceOrder: {
            select: {
              number: true,
              parcelIndex: true,
              parcelCount: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
      }),
      prisma.serviceOrder.findMany({
        where: {
          companyId: context.companyId,
          ...(filters.unitId ? { unitId: filters.unitId } : {}),
          number: { startsWith: "FEC-" },
          isBilled: true,
          receivables: {
            some: {
              originType: "SERVICE_ORDER",
            },
          },
        },
        select: {
          items: {
            select: {
              description: true,
              referencedOrderNumber: true,
            },
          },
        },
      }),
    ]);

    const hiddenSourceReceivableIds = new Set<string>();
    const hiddenSourceOrderNumbers = new Set<string>();
    for (const closure of billedClosures) {
      for (const item of closure.items) {
        for (const receivableId of extractReceivableIdsFromText(item.description)) {
          hiddenSourceReceivableIds.add(receivableId);
        }
      }
      for (const number of getReferencedOrderNumbersFromFecItems(closure.items)) {
        hiddenSourceOrderNumbers.add(number);
      }
    }

    const visibleReceivables = receivables.filter((receivable) => {
      if (receivable.originType !== "SERVICE_ORDER") return true;
      if (receivable.serviceOrder?.number.startsWith("FEC-")) return true;
      if (hiddenSourceReceivableIds.has(receivable.id)) return false;
      const orderNumber = receivable.serviceOrder?.number;
      return !orderNumber || !hiddenSourceOrderNumbers.has(orderNumber);
    });

    return {
      receivables: visibleReceivables.map(mapReceivableForResponse),
    };
  },

  async create(payload: ReceivableCreatePayload, context: ReceivableContext) {
    await ensureCustomerExists(context.companyId, payload.customerId);

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId ?? undefined,
    });

    const installmentGroupId = payload.installments > 1 ? randomUUID() : null;
    const baseDate = new Date(`${payload.dueDate}T00:00:00`);

    const created = await db.$transaction(async (tx) => {
      const items = [];

      for (let index = 0; index < payload.installments; index += 1) {
        const dueDate = addMonths(baseDate, index);
        const item = await tx.accountReceivable.create({
          data: {
            companyId: context.companyId,
            unitId: context.unitId || null,
            customerId: payload.customerId,
            description:
              payload.installments > 1
                ? `${payload.description} (${index + 1}/${payload.installments})`
                : payload.description,
            amount: payload.amount,
            dueDate,
            status: "PENDENTE",
            originType: "MANUAL",
            installmentGroupId,
            installmentNumber: payload.installments > 1 ? index + 1 : null,
            installmentCount: payload.installments > 1 ? payload.installments : null,
          },
        });
        items.push(item);
      }

      return items;
    });

    const enriched = await prisma.accountReceivable.findMany({
      where: {
        id: { in: created.map((r) => r.id) },
        companyId: context.companyId,
      },
      include: {
        customer: {
          select: {
            type: true,
            fullName: true,
            tradeName: true,
          },
        },
        unit: {
          select: {
            name: true,
          },
        },
        serviceOrder: {
          select: {
            number: true,
            parcelIndex: true,
            parcelCount: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return {
      receivables: enriched.map(mapReceivableForResponse),
    };
  },

  async update(id: string, payload: ReceivableUpdatePayload, context: ReceivableContext) {
    const existing = await prisma.accountReceivable.findFirst({
      where: {
        id,
        companyId: context.companyId,
        ...(context.unitId ? { unitId: context.unitId } : {}),
      },
      include: {
        serviceOrder: {
          select: {
            id: true,
            number: true,
          },
        },
      },
    });

    if (!existing) {
      throw new ServiceError("Recebível não encontrado.", 404);
    }

    if (
      existing.originType === "SERVICE_ORDER" &&
      existing.serviceOrder &&
      (payload.mode === "settle" || payload.mode === "reopen")
    ) {
      const currentAmount = Number(existing.amount);
      const partialAmount = Number(payload.partialAmount ?? 0);
      const isPartialSettle =
        payload.mode === "settle" &&
        partialAmount > 0 &&
        partialAmount < currentAmount;

      if (payload.mode === "settle" && partialAmount >= currentAmount) {
        throw new ServiceError(
          "O valor parcial nao pode ser igual ou maior que o valor devido. Use a baixa total.",
          400,
        );
      }

      const db = getAuditPrisma({
        userId: context.userId,
        companyId: context.companyId,
        activeUnitId: context.unitId ?? undefined,
      });

      await db.$transaction(async (tx) => {
        if (isPartialSettle) {
          const maxLineSlot = await tx.accountReceivable.aggregate({
            where: {
              serviceOrderId: existing.serviceOrder!.id,
              originType: "SERVICE_ORDER",
            },
            _max: {
              lineSlot: true,
            },
          });

          await tx.accountReceivable.update({
            where: { id: existing.id },
            data: {
              amount: partialAmount,
              status: "PAGO",
              paidAt: new Date(),
            },
          });

          await tx.accountReceivable.create({
            data: {
              companyId: existing.companyId,
              unitId: existing.unitId,
              customerId: existing.customerId,
              serviceOrderId: existing.serviceOrder!.id,
              lineSlot: (maxLineSlot._max.lineSlot ?? existing.lineSlot) + 1,
              originType: "SERVICE_ORDER",
              description: existing.description,
              amount: currentAmount - partialAmount,
              dueDate: existing.dueDate,
              status: "PENDENTE",
              paidAt: null,
              installmentGroupId: existing.installmentGroupId,
              installmentNumber: existing.installmentNumber,
              installmentCount: existing.installmentCount,
            },
          });
        } else {
          await tx.accountReceivable.update({
            where: { id: existing.id },
            data:
              payload.mode === "settle"
                ? { status: "PAGO", paidAt: new Date() }
                : { status: "PENDENTE", paidAt: null },
          });
        }

        const orderReceivables = await tx.accountReceivable.findMany({
          where: {
            serviceOrderId: existing.serviceOrder!.id,
            originType: "SERVICE_ORDER",
          },
          select: { status: true },
        });
        const { allPaid, paymentStatus } = paymentStatusFromReceivables(orderReceivables);

        if (existing.serviceOrder!.number.startsWith("FEC-")) {
          const closure = await tx.serviceOrder.findFirst({
            where: {
              id: existing.serviceOrder!.id,
              companyId: context.companyId,
              ...(context.unitId ? { unitId: context.unitId } : {}),
            },
            select: {
              id: true,
              status: true,
              items: {
                select: {
                  description: true,
                  referencedOrderNumber: true,
                  previousOrderStatus: true,
                },
              },
            },
          });

          if (!closure) {
            throw new ServiceError("Ordem de serviÃ§o nÃ£o encontrada.", 404);
          }

          const sourceNumbers = getReferencedOrderNumbersFromFecItems(closure.items);
          if (sourceNumbers.length > 0) {
            const sourceOrders = await tx.serviceOrder.findMany({
              where: {
                companyId: context.companyId,
                ...(context.unitId ? { unitId: context.unitId } : {}),
                number: { in: sourceNumbers },
              },
              select: {
                id: true,
                number: true,
                receivables: {
                  select: { id: true },
                },
              },
            });

            const sourceOrderIds = sourceOrders.map((order) => order.id);
            const sourceReceivableIds = sourceOrders.flatMap((order) => order.receivables.map((item) => item.id));

            if (sourceReceivableIds.length > 0) {
              await tx.accountReceivable.updateMany({
                where: { id: { in: sourceReceivableIds } },
                data: {
                  status: allPaid ? "PAGO" : "PENDENTE",
                  paidAt: allPaid ? new Date() : null,
                },
              });
            }

            if (sourceOrderIds.length > 0) {
              await tx.serviceOrder.updateMany({
                where: { id: { in: sourceOrderIds } },
                data: {
                  status: "CONCLUIDA",
                  paymentStatus: allPaid ? "PAGO" : "PENDENTE",
                  updatedByUserId: context.userId,
                },
              });
            }
          }

          await tx.serviceOrder.update({
            where: { id: existing.serviceOrder!.id },
            data: {
              status: "CONCLUIDA",
              paymentStatus,
              paymentMethod:
                payload.mode === "settle" && payload.paymentMethod?.trim().length
                  ? payload.paymentMethod.trim()
                  : undefined,
              updatedByUserId: context.userId,
            },
          });
        } else {
          await tx.serviceOrder.update({
            where: { id: existing.serviceOrder!.id },
            data: {
              status: "CONCLUIDA",
              paymentStatus,
              paymentMethod:
                payload.mode === "settle" && payload.paymentMethod?.trim().length
                  ? payload.paymentMethod.trim()
                  : undefined,
              updatedByUserId: context.userId,
            },
          });
        }
      });

      const refreshed = await prisma.accountReceivable.findFirstOrThrow({
        where: {
          id: existing.id,
          companyId: context.companyId,
        },
        include: {
          customer: {
            select: {
              type: true,
              fullName: true,
              tradeName: true,
            },
          },
          unit: {
            select: {
              name: true,
            },
          },
          serviceOrder: {
            select: {
              number: true,
              parcelIndex: true,
              parcelCount: true,
            },
          },
        },
      });

      return {
        receivable: mapReceivableForResponse(refreshed),
      };
    }

    if (payload.mode === "edit" && existing.originType === "SERVICE_ORDER") {
      throw new ServiceError("Recebíveis gerados por OS só podem ser baixados ou reabertos.", 400);
    }

    if (payload.mode === "edit" && payload.customerId) {
      await ensureCustomerExists(context.companyId, payload.customerId);
    }

    const data: Prisma.AccountReceivableUncheckedUpdateInput =
      payload.mode === "settle"
        ? { status: "PAGO", paidAt: new Date() }
        : payload.mode === "reopen"
          ? { status: "PENDENTE", paidAt: null }
          : {
              description: payload.description,
              customerId: payload.customerId,
              amount: payload.amount,
              dueDate: payload.dueDate ? new Date(`${payload.dueDate}T00:00:00`) : undefined,
            };

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId ?? undefined,
    });

    const updated = await db.accountReceivable.update({
      where: {
        id: existing.id,
      },
      data,
      include: {
        customer: {
          select: {
            type: true,
            fullName: true,
            tradeName: true,
          },
        },
        unit: {
          select: {
            name: true,
          },
        },
        serviceOrder: {
          select: {
            number: true,
            parcelIndex: true,
            parcelCount: true,
          },
        },
      },
    });

    return {
      receivable: mapReceivableForResponse(updated),
    };
  },
};
