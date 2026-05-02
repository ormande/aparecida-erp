import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AuditContext = {
  userId: string;
  companyId: string;
  activeUnitId?: string;
};

const IGNORED_MODELS = new Set([
  "AuditLog",
  "Session",
  "User",
  "Company",
  "Account",
  "VerificationToken",
  "Unit",
  "UserUnit",
]);

const ENTITY_TYPE_BY_MODEL: Record<string, string> = {
  Customer: "customer",
  Supplier: "supplier",
  ServiceCatalog: "service_catalog",
  ServiceOrder: "service_order",
  ServiceOrderItem: "service_order_item",
  AccountReceivable: "receivable",
  AccountPayable: "payable",
};

function getModelDelegate(client: PrismaClient, model: string) {
  const key = `${model.charAt(0).toLowerCase()}${model.slice(1)}` as keyof PrismaClient;
  return client[key] as {
    findFirst?: (args: unknown) => Promise<unknown>;
  };
}

function toEntityType(model: string) {
  return ENTITY_TYPE_BY_MODEL[model] ?? model.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Prisma.Decimal) {
    return Number(value);
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, innerValue]) => [key, serializeValue(innerValue)]),
    );
  }

  return value;
}

async function findBeforeData(model: string, where: unknown) {
  const delegate = getModelDelegate(prisma, model);

  if (!delegate?.findFirst || !where) {
    return null;
  }

  try {
    const before = await delegate.findFirst({ where });
    return before ? serializeValue(before) : null;
  } catch {
    return null;
  }
}

function shouldAudit(model: string) {
  return !IGNORED_MODELS.has(model);
}

function resolveUnitId(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    if (c) return c;
  }
  return null;
}

export function getAuditPrisma(context: AuditContext) {
  return prisma.$extends({
    name: "audit-extension",
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const result = await query(args);

          if (!shouldAudit(model)) {
            return result;
          }

          try {
            await prisma.auditLog.create({
              data: {
                companyId: context.companyId,
                unitId: resolveUnitId((result as { unitId?: string | null })?.unitId, context.activeUnitId),
                userId: context.userId,
                entityType: toEntityType(model),
                entityId: String((result as { id?: string | number })?.id ?? ""),
                action: "CREATE",
                afterData: serializeValue(result) as Prisma.InputJsonValue,
              },
            });
          } catch (auditError) {
            console.error("[audit] falha ao registrar CREATE:", auditError);
          }

          return result;
        },

        async update({ model, args, query }) {
          const beforeData = await findBeforeData(model, args.where);
          const result = await query(args);

          if (!shouldAudit(model)) {
            return result;
          }

          try {
            await prisma.auditLog.create({
              data: {
                companyId: context.companyId,
                unitId: resolveUnitId((result as { unitId?: string | null })?.unitId, context.activeUnitId),
                userId: context.userId,
                entityType: toEntityType(model),
                entityId: String((result as { id?: string | number })?.id ?? ""),
                action: "UPDATE",
                beforeData: beforeData ? (beforeData as Prisma.InputJsonValue) : undefined,
                afterData: serializeValue(result) as Prisma.InputJsonValue,
              },
            });
          } catch (auditError) {
            console.error("[audit] falha ao registrar UPDATE:", auditError);
          }

          return result;
        },

        async delete({ model, args, query }) {
          const beforeData = await findBeforeData(model, args.where);
          const result = await query(args);

          if (!shouldAudit(model)) {
            return result;
          }

          try {
            await prisma.auditLog.create({
              data: {
                companyId: context.companyId,
                unitId: resolveUnitId(
                  (beforeData as { unitId?: string | null } | null)?.unitId,
                  (result as { unitId?: string | null })?.unitId,
                  context.activeUnitId,
                ),
                userId: context.userId,
                entityType: toEntityType(model),
                entityId: String(
                  (beforeData as { id?: string | number } | null)?.id ?? (result as { id?: string | number })?.id ?? "",
                ),
                action: "DELETE",
                beforeData: beforeData ? (beforeData as Prisma.InputJsonValue) : undefined,
              },
            });
          } catch (auditError) {
            console.error("[audit] falha ao registrar DELETE:", auditError);
          }

          return result;
        },
      },
    },
  });
}
