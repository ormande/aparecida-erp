import { randomUUID } from "crypto";

import type { Prisma } from "@prisma/client";

import { mapPayableToAppPayable } from "@/lib/db-mappers";
import { getAuditPrisma } from "@/lib/prisma-audit";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/services/service-error";

type PayableCategoryLabel = "Aluguel" | "Fornecedores" | "Água/Luz" | "Funcionários" | "Outros";

type PayableCreatePayload = {
  description: string;
  category: PayableCategoryLabel;
  supplierId?: string | null;
  amount: number;
  dueDate: string;
  installments: number;
};

type PayableUpdatePayload = {
  mode: "edit" | "settle" | "reopen";
  description?: string;
  category?: PayableCategoryLabel;
  supplierId?: string | null;
  amount?: number;
  dueDate?: string;
};

type PayableContext = {
  companyId: string;
  unitId: string;
  userId: string;
};

function mapCategory(category?: PayableCategoryLabel) {
  switch (category) {
    case "Aluguel":
      return "ALUGUEL" as const;
    case "Fornecedores":
      return "FORNECEDORES" as const;
    case "Água/Luz":
      return "AGUA_LUZ" as const;
    case "Funcionários":
      return "FUNCIONARIOS" as const;
    case "Outros":
      return "OUTROS" as const;
    default:
      return undefined;
  }
}

function mapRequiredCategory(category: PayableCategoryLabel) {
  return mapCategory(category) ?? "OUTROS";
}

function addMonths(base: Date, months: number) {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next;
}

function mapPayableForResponse(
  payable: Awaited<ReturnType<typeof prisma.accountPayable.findFirstOrThrow>> & {
    supplier?: {
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
    ...mapPayableToAppPayable(payable),
    supplierName: payable.supplier
      ? payable.supplier.type === "PF"
        ? payable.supplier.fullName ?? "-"
        : payable.supplier.tradeName ?? "-"
      : "-",
    unitName: payable.unit?.name ?? "Geral",
  };
}

async function ensureSupplierExists(companyId: string, supplierId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, companyId },
    select: { id: true },
  });

  if (!supplier) {
    throw new ServiceError("Fornecedor não encontrado.", 404);
  }
}

export const payableService = {
  async list(
    filters: { status?: string | null; period?: string | null },
    context: Pick<PayableContext, "companyId" | "unitId">,
  ) {
    let periodDueDateRange: { gte: Date; lt: Date } | undefined;
    if (filters.period) {
      const start = new Date(`${filters.period}-01T00:00:00`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      periodDueDateRange = { gte: start, lt: end };
    }

    const payables = await prisma.accountPayable.findMany({
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
        supplier: {
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
      payables: payables.map(mapPayableForResponse),
    };
  },

  async create(payload: PayableCreatePayload, context: PayableContext) {
    if (payload.supplierId) {
      await ensureSupplierExists(context.companyId, payload.supplierId);
    }

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
        const item = await tx.accountPayable.create({
          data: {
            companyId: context.companyId,
            unitId: context.unitId,
            supplierId: payload.supplierId || null,
            description:
              payload.installments > 1
                ? `${payload.description} (${index + 1}/${payload.installments})`
                : payload.description,
            category: mapRequiredCategory(payload.category),
            amount: payload.amount,
            dueDate,
            status: "PENDENTE",
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
      payables: created.map(mapPayableToAppPayable),
    };
  },

  async update(id: string, payload: PayableUpdatePayload, context: PayableContext) {
    const existing = await prisma.accountPayable.findFirst({
      where: {
        id,
        companyId: context.companyId,
        unitId: context.unitId,
      },
    });

    if (!existing) {
      throw new ServiceError("Conta a pagar não encontrada.", 404);
    }

    if (payload.mode === "edit" && payload.supplierId) {
      await ensureSupplierExists(context.companyId, payload.supplierId);
    }

    const data: Prisma.AccountPayableUncheckedUpdateInput =
      payload.mode === "settle"
        ? { status: "PAGO", paidAt: new Date() }
        : payload.mode === "reopen"
          ? { status: "PENDENTE", paidAt: null }
          : {
              description: payload.description,
              category: mapCategory(payload.category),
              supplierId: payload.supplierId === undefined ? undefined : payload.supplierId,
              amount: payload.amount,
              dueDate: payload.dueDate ? new Date(`${payload.dueDate}T00:00:00`) : undefined,
            };

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    const updated = await db.accountPayable.update({
      where: {
        id: existing.id,
      },
      data,
      include: {
        supplier: {
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
      payable: mapPayableForResponse(updated),
    };
  },
};
