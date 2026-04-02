import { randomUUID } from "crypto";

import type { Prisma } from "@prisma/client";

import { mapReceivableToAppReceivable } from "@/lib/db-mappers";
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
};

type ReceivableContext = {
  companyId: string;
  unitId: string;
  userId: string;
};

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
    filters: { status?: string | null; period?: string | null },
    context: Pick<ReceivableContext, "companyId" | "unitId">,
  ) {
    let periodDueDateRange: { gte: Date; lt: Date } | undefined;
    if (filters.period) {
      const start = new Date(`${filters.period}-01T00:00:00`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      periodDueDateRange = { gte: start, lt: end };
    }

    const receivables = await prisma.accountReceivable.findMany({
      where: {
        companyId: context.companyId,
        unitId: context.unitId,
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
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    return {
      receivables: receivables.map(mapReceivableForResponse),
    };
  },

  async create(payload: ReceivableCreatePayload, context: ReceivableContext) {
    await ensureCustomerExists(context.companyId, payload.customerId);

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
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
            unitId: context.unitId,
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

    return {
      receivables: created.map(mapReceivableToAppReceivable),
    };
  },

  async update(id: string, payload: ReceivableUpdatePayload, context: ReceivableContext) {
    const existing = await prisma.accountReceivable.findFirst({
      where: {
        id,
        companyId: context.companyId,
        unitId: context.unitId,
      },
    });

    if (!existing) {
      throw new ServiceError("Recebível não encontrado.", 404);
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
      activeUnitId: context.unitId,
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
      },
    });

    return {
      receivable: mapReceivableForResponse(updated),
    };
  },
};
