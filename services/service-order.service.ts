import { randomUUID } from "crypto";

import { mapServiceOrderStatus } from "@/lib/db-mappers";
import {
  buildInstallmentsForBilling,
  installmentPlanToJson,
  orderInstallmentPayloadsToJson,
  parseStoredBillingPlan,
  trimBillingPlanRemovingParcelIndices,
  type NormalizedInstallmentRow,
  type OrderInstallmentPayload,
} from "@/lib/os-installments";
import {
  aggregateFecLineContributionsByOrderNumber,
  fecLineReferencedOrderNumbers,
  fecOutstandingFromItems,
  fetchReferencedOrderNumbersInAllClosures,
  fetchReferencedOrderNumbersInOpenClosures,
  fetchReferencedReceivableIdsInAllClosures,
  getReferencedOrderNumbersFromFecItems,
  plannedParcelIndicesFromFecItems,
} from "@/lib/service-order-reference";
import { getAuditPrisma } from "@/lib/prisma-audit";
import { prisma } from "@/lib/prisma";
import { normalizeSearch } from "@/lib/search-helpers";
import { ServiceError } from "@/services/service-error";
import { Prisma, type PaymentStatus, type ProductUnit, type ServiceOrderStatus } from "@prisma/client";

/** Default do Prisma é 5s; faturamento, FEC e criação de várias OS parceladas + auditoria pode levar mais. */
const BILLING_INTERACTIVE_TX = { maxWait: 15_000, timeout: 60_000 } as const;

type OrderServiceItemPayload = {
  serviceId?: string | null;
  description: string;
  quantity?: number;
  laborPrice: number;
  executedByUserId?: string | null;
  commissionRate?: number;
};

type OrderProductPayload = {
  productId?: string | null;
  description: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
};

type CreateOrderPayload = {
  unitId: string;
  customerId?: string | null;
  customerNameSnapshot?: string;
  dueDate?: string | null;
  openedAt?: string;
  paymentTerm?: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod?: string;
  customOsNumber?: number;
  notes?: string;
  services: OrderServiceItemPayload[];
  products?: OrderProductPayload[];
  installments?: OrderInstallmentPayload[];
};

type UpdateOrderPayload = {
  mode: "edit" | "bill" | "unbill" | "settle" | "reopen";
  discountAmount?: number;
  partialAmount?: number;
  customerId?: string | null;
  customerNameSnapshot?: string;
  dueDate?: string | null;
  paymentTerm?: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod?: string;
  customOsNumber?: number;
  notes?: string;
  services?: OrderServiceItemPayload[];
  products?: OrderProductPayload[];
  /** Na edição: ausente = não altera o plano; array vazio ou menos de 2 = remove parcelas salvas; 2+ = novo plano. */
  installments?: OrderInstallmentPayload[] | null;
};

type ServiceOrderContext = {
  companyId: string;
  unitId?: string;
  userId: string;
};

type ListOrdersFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  unitId?: string;
  customerId?: string;
  /** Ex.: "FEC-" para listar só OS de fechamento */
  numberPrefix?: string;
  /** Exclui números que começam com FEC- (útil para agrupamento / fechamento) */
  excludeFechamentos?: boolean;
  /** Mês de abertura (YYYY-MM), intervalo [início, fim do mês) */
  openedMonth?: string;
  /** Filtro de data mínima (YYYY-MM-DD) */
  openedFrom?: string;
  /** Filtro de data máxima (YYYY-MM-DD) */
  openedTo?: string;
  minTotal?: number;
  maxTotal?: number;
  paymentStatus?: string;
  /** Filtro das abas de listagem: OS abertas (não faturadas), faturadas (não pagas), pagas */
  billingScope?: "ABERTAS" | "FATURADAS" | "PAGAS";
};

function buildOrderNumber(year: number, sequence: number) {
  return `OS-${year}-${String(sequence).padStart(5, "0")}`;
}

async function getManualOrderNumber(
  tx: any,
  companyId: string,
  customNumber: number,
  excludeOrderId?: string,
) {
  if (!Number.isInteger(customNumber) || customNumber < 1 || customNumber > 99999) {
    throw new ServiceError("Número da OS inválido. Use um valor entre 1 e 99999.", 400);
  }

  const lockKey = `${companyId}-os-number`;
  // pg_advisory_xact_lock(...) retorna void; use executeRaw para não desserializar resultado.
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1::text))", lockKey);

  const currentYear = new Date().getFullYear();
  const formatted = buildOrderNumber(currentYear, customNumber);
  const exists = await tx.serviceOrder.findFirst({
    where: { companyId, number: formatted },
    select: { id: true },
  });
  if (exists && exists.id !== excludeOrderId) {
    throw new ServiceError(
      `Já existe uma OS com o número OS-${currentYear}-${String(customNumber).padStart(5, "0")}.`,
      409,
    );
  }
  return formatted;
}

/** Ano da OS manual/auto no formato OS-AAAA-#####(-Pk)?; null se não casar. */
function parseManualOsYearFromNumber(number: string): number | null {
  const m = /^OS-(\d{4})-\d{5}(?:-P\d+)?$/i.exec(number.trim());
  return m ? Number(m[1]) : null;
}

/**
 * Número completo ao editar OS com número manual: mantém ano e sufixo -Pk do grupo parcelado.
 * Evita falso conflito com a 1ª parcela (mesmo ##### sem sufixo).
 */
async function resolveOrderNumberForManualEdit(
  tx: any,
  companyId: string,
  customNumber: number,
  existing: {
    id: string;
    number: string;
    parcelGroupId: string | null;
    parcelIndex: number | null;
  },
) {
  if (!Number.isInteger(customNumber) || customNumber < 1 || customNumber > 99999) {
    throw new ServiceError("Número da OS inválido. Use um valor entre 1 e 99999.", 400);
  }

  const year = parseManualOsYearFromNumber(existing.number) ?? new Date().getFullYear();
  const formattedBase = buildOrderNumber(year, customNumber);
  const idx = existing.parcelIndex;
  const desired =
    idx != null && idx >= 2 && existing.parcelGroupId ? `${formattedBase}-P${idx}` : formattedBase;

  if (desired === existing.number) {
    return existing.number;
  }

  const lockKey = `${companyId}-os-number`;
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1::text))", lockKey);

  const conflict = await tx.serviceOrder.findFirst({
    where: { companyId, number: desired },
    select: { id: true },
  });
  if (conflict && conflict.id !== existing.id) {
    throw new ServiceError(`Já existe uma OS com o número ${desired}.`, 409);
  }

  return desired;
}

async function getNextAutoOrderNumber(tx: any, companyId: string) {
  const lockKey = `${companyId}-os-number`;
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1::text))", lockKey);

  const currentYear = new Date().getFullYear();
  const orders = await tx.serviceOrder.findMany({
    where: {
      companyId,
      number: {
        startsWith: `OS-${currentYear}-`,
      },
    },
    select: { number: true },
    orderBy: { number: "asc" },
  });

  const used = new Set(
    orders
      .map((order: { number: string }) => {
        const m = /^OS-\d{4}-(\d{5})$/.exec(order.number);
        return m ? Number(m[1]) : NaN;
      })
      .filter((value: number) => Number.isFinite(value) && value > 0),
  );

  let next = 1;
  while (used.has(next)) {
    next += 1;
  }

  return buildOrderNumber(currentYear, next);
}

function serviceOrderAfterDataForAudit(order: {
  id: string;
  companyId: string;
  unitId: string;
  customerId: string | null;
  customerNameSnapshot: string | null;
  number: string;
  status: string;
  paymentStatus: string;
  isBilled: boolean;
  openedAt: Date;
  closedAt: Date | null;
  dueDate: Date | null;
  paymentTerm: string | null;
  paymentMethod: string | null;
  notes: string | null;
  isStandalone: boolean;
  totalAmount: Prisma.Decimal;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Prisma.InputJsonValue {
  return {
    id: order.id,
    companyId: order.companyId,
    unitId: order.unitId,
    customerId: order.customerId,
    customerNameSnapshot: order.customerNameSnapshot,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    isBilled: order.isBilled,
    openedAt: order.openedAt.toISOString(),
    closedAt: order.closedAt?.toISOString() ?? null,
    dueDate: order.dueDate?.toISOString() ?? null,
    paymentTerm: order.paymentTerm,
    paymentMethod: order.paymentMethod,
    notes: order.notes,
    isStandalone: order.isStandalone,
    totalAmount: Number(order.totalAmount),
    createdByUserId: order.createdByUserId,
    updatedByUserId: order.updatedByUserId,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

/** Trava linhas de OS na ordem dos ids (evita deadlock) para leitura coerente de isBilled sob concorrência. */
async function lockServiceOrdersByIdForUpdate(tx: { $executeRaw: (args: Prisma.Sql) => Promise<unknown> }, orderIds: string[]) {
  const sorted = Array.from(new Set(orderIds)).sort();
  for (const orderId of sorted) {
    await tx.$executeRaw(Prisma.sql`SELECT 1 FROM "ServiceOrder" WHERE id = ${orderId} FOR UPDATE`);
  }
}

function receivableAfterDataForAudit(receivable: {
  id: string;
  companyId: string;
  unitId: string | null;
  customerId: string | null;
  serviceOrderId: string | null;
  lineSlot: number;
  originType: string;
  description: string;
  amount: Prisma.Decimal;
  dueDate: Date;
  paidAt: Date | null;
  status: string;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  createdAt: Date;
  updatedAt: Date;
} | null | undefined): Prisma.InputJsonValue {
  if (!receivable) {
    return {};
  }
  return {
    id: receivable.id,
    companyId: receivable.companyId,
    unitId: receivable.unitId,
    customerId: receivable.customerId,
    serviceOrderId: receivable.serviceOrderId,
    lineSlot: receivable.lineSlot,
    originType: receivable.originType,
    description: receivable.description,
    amount: Number(receivable.amount),
    dueDate: receivable.dueDate.toISOString(),
    paidAt: receivable.paidAt?.toISOString() ?? null,
    status: receivable.status,
    installmentGroupId: receivable.installmentGroupId,
    installmentNumber: receivable.installmentNumber,
    installmentCount: receivable.installmentCount,
    createdAt: receivable.createdAt.toISOString(),
    updatedAt: receivable.updatedAt.toISOString(),
  };
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

async function getOrder(companyId: string, unitId: string | undefined, id: string) {
  return prisma.serviceOrder.findFirst({
    where: { id, companyId, ...(unitId ? { unitId } : {}) },
    include: {
      customer: {
        select: {
          type: true,
          fullName: true,
          tradeName: true,
        },
      },
      items: {
        select: {
          id: true,
          serviceId: true,
          description: true,
          referencedOrderNumber: true,
          quantity: true,
          laborPrice: true,
          lineTotal: true,
          previousOrderStatus: true,
          executedByUserId: true,
          executedBy: {
            select: {
              name: true,
            },
          },
        },
      },
      products: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          productId: true,
          description: true,
          unit: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          sortOrder: true,
        },
      },
      receivables: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          amount: true,
          dueDate: true,
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
    parcelGroupId: order.parcelGroupId,
    parcelIndex: order.parcelIndex,
    parcelCount: order.parcelCount,
    clientId: order.customerId,
    clientName: getCustomerDisplayName(order),
    customerNameSnapshot: order.customerNameSnapshot,
    unitId: order.unitId,
    unitName: order.unit?.name ?? "",
    status: mapServiceOrderStatus(order.status),
    paymentStatus: order.paymentStatus,
    isBilled: order.isBilled,
    total: Number(order.totalAmount),
    openedAt: order.openedAt.toISOString().slice(0, 10),
    dueDate: order.dueDate?.toISOString().slice(0, 10) ?? "",
    paymentTerm: order.paymentTerm,
    paymentMethod: order.paymentMethod ?? "",
    notes: order.notes ?? "",
    isStandalone: order.isStandalone,
    laborSubtotal: Number(order.laborSubtotal),
    productsSubtotal: Number(order.productsSubtotal),
    services: order.items.map((item) => ({
      id: item.id,
      serviceId: item.serviceId,
      description: item.description,
      quantity: item.quantity,
      laborPrice: Number(item.laborPrice),
      executedByUserId: item.executedByUserId,
      executedByName: item.executedBy?.name ?? null,
    })),
    products: order.products.map((p) => ({
      id: p.id,
      productId: p.productId,
      description: p.description,
      unit: p.unit,
      quantity: Number(p.quantity),
      unitPrice: Number(p.unitPrice),
      totalPrice: Number(p.totalPrice),
      sortOrder: p.sortOrder,
    })),
    receivableStatus:
      order.receivables.find((r) => r.status === "PENDENTE")?.status
        ?? order.receivables[0]?.status
        ?? null,
    receivableAmount: order.receivables
      .filter((r) => r.status === "PENDENTE" || r.status === "VENCIDO")
      .reduce((sum, r) => sum + Number(r.amount), 0),
    billingInstallmentPlan: parseStoredBillingPlan(order.billingInstallmentPlan) ?? null,
  };
}

function mapStatusFilter(status?: string) {
  switch (status) {
    case "Aberta":
      return "ABERTA" as const;
    case "Em andamento":
      return "EM_ANDAMENTO" as const;
    case "Aguardando peça":
    case "Aguardando peÃ§a":
      return "AGUARDANDO_PECA" as const;
    case "Concluída":
    case "ConcluÃ­da":
      return "CONCLUIDA" as const;
    case "Cancelada":
      return "CANCELADA" as const;
    default:
      return undefined;
  }
}

async function ensureCustomerExists(customerId: string, companyId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
    select: { id: true },
  });

  if (!customer) {
    throw new ServiceError("Cliente não encontrado.", 404);
  }
}

/** Valor finito com 2 casas para Decimal(10,2) no Postgres. */
function receivableAmount2(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new ServiceError("Valor de recebível inválido.", 400);
  }
  return Math.round(value * 100) / 100;
}

function calcOrderTotals(
  services: Array<{ laborPrice: number; quantity?: number }>,
  products: Array<{ quantity: number; unitPrice: number }>,
) {
  const laborSubtotal = services.reduce((sum, item) => sum + (item.quantity ?? 1) * Number(item.laborPrice), 0);
  const productsSubtotal = products.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return {
    laborSubtotal,
    productsSubtotal,
    totalAmount: laborSubtotal + productsSubtotal,
  };
}

function splitLaborProductsAcrossParcels(
  laborSubtotal: number,
  productsSubtotal: number,
  totalAmount: number,
  normalized: NormalizedInstallmentRow[],
): Array<{ labor: number; products: number }> {
  const n = normalized.length;
  if (n === 0) {
    return [];
  }
  let sumLabor = 0;
  const out: Array<{ labor: number; products: number }> = [];
  for (let i = 0; i < n - 1; i++) {
    const A = normalized[i].amount;
    const labor = receivableAmount2((laborSubtotal * A) / totalAmount);
    const products = receivableAmount2(A - labor);
    out.push({ labor, products });
    sumLabor += labor;
  }
  const ALast = normalized[n - 1].amount;
  const laborLast = receivableAmount2(laborSubtotal - sumLabor);
  const productsLast = receivableAmount2(ALast - laborLast);
  out.push({ labor: laborLast, products: productsLast });
  return out;
}

function scaleServiceItemsForParcel(
  services: OrderServiceItemPayload[],
  targetLabor: number,
): OrderServiceItemPayload[] {
  const sourceLabor = services.reduce((s, x) => s + (x.quantity ?? 1) * x.laborPrice, 0);
  if (sourceLabor <= 0) {
    return services.map((x) => ({ ...x, laborPrice: 0 }));
  }
  const factor = targetLabor / sourceLabor;
  const scaled = services.map((service) => ({
    ...service,
    laborPrice: receivableAmount2(service.laborPrice * factor),
  }));
  const sumScaled = scaled.reduce((s, x) => s + (x.quantity ?? 1) * x.laborPrice, 0);
  const drift = receivableAmount2(targetLabor - sumScaled);
  if (drift !== 0 && scaled.length > 0) {
    const last = scaled[scaled.length - 1];
    const q = last.quantity ?? 1;
    last.laborPrice = receivableAmount2(last.laborPrice + drift / q);
  }
  return scaled;
}

function scaleProductItemsForParcel(
  products: OrderProductPayload[],
  targetProducts: number,
): OrderProductPayload[] {
  const source = products.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
  if (source <= 0) {
    return products.map((p) => ({ ...p, unitPrice: 0 }));
  }
  const factor = targetProducts / source;
  const scaled = products.map((p) => ({
    ...p,
    unitPrice: receivableAmount2(p.unitPrice * factor),
  }));
  const sumScaled = scaled.reduce((s, p) => s + p.quantity * p.unitPrice, 0);
  const drift = receivableAmount2(targetProducts - sumScaled);
  if (drift !== 0 && scaled.length > 0) {
    const last = scaled[scaled.length - 1];
    last.unitPrice = receivableAmount2(last.unitPrice + drift / last.quantity);
  }
  return scaled;
}

async function assertOrderNumberFree(tx: any, companyId: string, number: string) {
  const exists = await tx.serviceOrder.findFirst({
    where: { companyId, number },
    select: { id: true },
  });
  if (exists) {
    throw new ServiceError(`Já existe uma OS com o número ${number}.`, 409);
  }
}

function resolveInstallmentPayloadForBill(
  storedRaw: unknown,
  body: OrderInstallmentPayload[] | null | undefined,
): OrderInstallmentPayload[] | undefined {
  const parsed = parseStoredBillingPlan(storedRaw);
  if (parsed && parsed.length >= 2) {
    return parsed;
  }
  const fromBody = body ?? undefined;
  if (fromBody && fromBody.length >= 2) {
    return fromBody;
  }
  return undefined;
}

export const serviceOrderService = {
  async list(filters: ListOrdersFilters, context: Pick<ServiceOrderContext, "companyId">) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
    const skip = (page - 1) * limit;
    const normalizedSearch = filters.search?.trim();
    const mappedStatus = mapStatusFilter(filters.status);
    const where: Prisma.ServiceOrderWhereInput = {
      companyId: context.companyId,
      unitId: filters.unitId || undefined,
      customerId: filters.customerId,
      status: mappedStatus,
    };

    const extraAnd: Prisma.ServiceOrderWhereInput[] = [];

    if (filters.numberPrefix?.trim()) {
      extraAnd.push({ number: { startsWith: filters.numberPrefix.trim() } });
    }

    if (filters.excludeFechamentos) {
      extraAnd.push({ NOT: { number: { startsWith: "FEC-" } } });
    }

    const openedMonthMatch = filters.openedMonth?.trim() && /^(\d{4})-(\d{2})$/.exec(filters.openedMonth.trim());
    if (openedMonthMatch) {
      const y = Number(openedMonthMatch[1]);
      const m = Number(openedMonthMatch[2]);
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const end = new Date(y, m, 1, 0, 0, 0, 0);
      extraAnd.push({ openedAt: { gte: start, lt: end } });
    }

    if (filters.openedFrom?.trim()) {
      extraAnd.push({ openedAt: { gte: new Date(`${filters.openedFrom.trim()}T00:00:00`) } });
    }
    if (filters.openedTo?.trim()) {
      extraAnd.push({ openedAt: { lte: new Date(`${filters.openedTo.trim()}T23:59:59.999`) } });
    }

    const minTot =
      typeof filters.minTotal === "number" && !Number.isNaN(filters.minTotal) ? filters.minTotal : undefined;
    const maxTot =
      typeof filters.maxTotal === "number" && !Number.isNaN(filters.maxTotal) ? filters.maxTotal : undefined;
    if (minTot !== undefined && maxTot !== undefined) {
      extraAnd.push({ totalAmount: { gte: minTot, lte: maxTot } });
    } else if (minTot !== undefined) {
      extraAnd.push({ totalAmount: { gte: minTot } });
    } else if (maxTot !== undefined) {
      extraAnd.push({ totalAmount: { lte: maxTot } });
    }

    const ps = filters.paymentStatus?.trim();
    if (ps === "PENDENTE" || ps === "PAGO_PARCIAL" || ps === "PAGO") {
      extraAnd.push({ paymentStatus: ps });
    }

    const bs = filters.billingScope;
    if (bs === "ABERTAS") {
      extraAnd.push({ isBilled: false });
      /** Evita OS já quitadas na aba errada e duplicação com “Pagas”; aberta = ainda não faturada e não totalmente paga. */
      extraAnd.push({ paymentStatus: { not: "PAGO" } });
    } else if (bs === "FATURADAS") {
      extraAnd.push({ NOT: { paymentStatus: "PAGO" } });
      extraAnd.push({
        OR: [
          { isBilled: true },
          {
            isBilled: false,
            receivables: {
              some: {
                status: { in: ["PENDENTE", "VENCIDO"] },
              },
            },
          },
        ],
      });
    } else if (bs === "PAGAS") {
      extraAnd.push({ paymentStatus: "PAGO" });
    }

    if (extraAnd.length > 0) {
      where.AND = extraAnd;
    }

    if (normalizedSearch) {
      const pattern = `%${normalizeSearch(normalizedSearch)}%`;
      /** Mesmos critérios da listagem por aba — evita IDs “largos” na busca textual divergirem do esperado em produção. */
      const fecSql = filters.excludeFechamentos
        ? Prisma.sql` AND so."number" NOT LIKE 'FEC-%'`
        : Prisma.sql``;
      const billingScopeSql =
        bs === "ABERTAS"
          ? Prisma.sql` AND so."isBilled" = false AND so."paymentStatus"::text <> 'PAGO'`
          : bs === "PAGAS"
            ? Prisma.sql` AND so."paymentStatus"::text = 'PAGO'`
            : Prisma.sql``;
      const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT DISTINCT so."id"
        FROM "ServiceOrder" so
        LEFT JOIN "Customer" c ON c."id" = so."customerId"
        LEFT JOIN "ServiceOrderItem" soi ON soi."serviceOrderId" = so."id"
        WHERE so."companyId" = ${context.companyId}
          AND (
            unaccent(LOWER(COALESCE(so."number", ''))) LIKE unaccent(LOWER(${pattern}::text))
            OR unaccent(LOWER(COALESCE(so."customerNameSnapshot", ''))) LIKE unaccent(LOWER(${pattern}::text))
            OR unaccent(LOWER(COALESCE(c."fullName", ''))) LIKE unaccent(LOWER(${pattern}::text))
            OR unaccent(LOWER(COALESCE(c."tradeName", ''))) LIKE unaccent(LOWER(${pattern}::text))
            OR unaccent(LOWER(COALESCE(soi."description", ''))) LIKE unaccent(LOWER(${pattern}::text))
          )
          ${fecSql}
          ${billingScopeSql}
      `);
      const ids = rows.map((row) => row.id);
      where.id = { in: ids.length > 0 ? ids : [] };
    }

    const [total, orders, lockedOrderNumbers, lockedInAnyClosure, lockedReceivableIds] = await Promise.all([
      prisma.serviceOrder.count({ where }),
      prisma.serviceOrder.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { number: "asc" }],
        skip,
        take: limit,
        select: {
          id: true,
          number: true,
          customerId: true,
          unitId: true,
          customerNameSnapshot: true,
          totalAmount: true,
          laborSubtotal: true,
          productsSubtotal: true,
          openedAt: true,
          dueDate: true,
          paymentTerm: true,
          paymentMethod: true,
          isStandalone: true,
          paymentStatus: true,
          isBilled: true,
          status: true,
          billingInstallmentPlan: true,
          parcelGroupId: true,
          parcelIndex: true,
          parcelCount: true,
          customer: {
            select: {
              type: true,
              fullName: true,
              tradeName: true,
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
              executedByUserId: true,
              executedBy: {
                select: {
                  name: true,
                },
              },
            },
          },
          receivables: {
            select: {
              id: true,
              status: true,
              amount: true,
              dueDate: true,
              installmentNumber: true,
              installmentCount: true,
            },
          },
        },
      }),
      fetchReferencedOrderNumbersInOpenClosures(context.companyId, filters.unitId),
      fetchReferencedOrderNumbersInAllClosures(context.companyId, filters.unitId),
      fetchReferencedReceivableIdsInAllClosures(context.companyId, filters.unitId),
    ]);

    return {
      data: orders.map((order) => {
        let executedByName: string | null = null;
        for (const line of order.items) {
          if (line.executedByUserId && line.executedBy?.name) {
            executedByName = line.executedBy.name;
            break;
          }
        }
        return {
        id: order.id,
        number: order.number,
        clientId: order.customerId,
        clientName: getCustomerDisplayName(order),
        unitId: order.unitId,
        unitName: order.unit.name,
        servicesLabel: order.items.map((service) => service.description).join(", "),
        executedByName,
        status: mapServiceOrderStatus(order.status),
        total: Number(order.totalAmount),
        openedAt: order.openedAt.toISOString().slice(0, 10),
        dueDate: order.dueDate?.toISOString().slice(0, 10) ?? null,
        paymentTerm: order.paymentTerm,
        paymentMethod: order.paymentMethod ?? "",
        isStandalone: order.isStandalone,
        receivableStatus:
          order.receivables.find((r) => r.status === "PENDENTE")?.status
            ?? order.receivables[0]?.status
            ?? null,
        receivableCount: order.receivables.length,
        receivableLines: order.receivables.map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          dueDate: r.dueDate.toISOString().slice(0, 10),
          status: r.status,
          installmentNumber: r.installmentNumber,
          installmentCount: r.installmentCount,
          isLockedByAnyClosure: lockedReceivableIds.has(r.id),
        })),
        paymentStatus: order.paymentStatus,
        isBilled: order.isBilled,
        hasInstallmentPlan: order.billingInstallmentPlan !== null,
        billingInstallmentPlanRows: (() => {
          const parsed = parseStoredBillingPlan(order.billingInstallmentPlan);
          return parsed && parsed.length > 0 ? parsed : undefined;
        })(),
        isLockedByOpenClosure:
          !order.number.startsWith("FEC-") &&
          order.paymentStatus !== "PAGO" &&
          lockedOrderNumbers.has(order.number),
        isLockedByAnyClosure:
          !order.number.startsWith("FEC-") &&
          lockedInAnyClosure.has(order.number),
        receivableAmount: order.receivables
          .filter((r) => r.status === "PENDENTE" || r.status === "VENCIDO")
          .reduce((sum, r) => sum + Number(r.amount), 0),
        parcelGroupId: order.parcelGroupId,
        parcelIndex: order.parcelIndex,
        parcelCount: order.parcelCount,
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  },

  async getById(id: string, context: Pick<ServiceOrderContext, "companyId" | "unitId">) {
    const order = await getOrder(context.companyId, context.unitId, id);

    if (!order) {
      throw new ServiceError("Ordem de serviço não encontrada.", 404);
    }

    return { order: mapOrder(order) };
  },

  async create(payload: CreateOrderPayload, context: ServiceOrderContext) {
    if (payload.customerId) {
      await ensureCustomerExists(payload.customerId, context.companyId);
    }

    const isStandalone = !payload.customerId;
    const productsList = payload.products ?? [];
    const { laborSubtotal, productsSubtotal, totalAmount } = calcOrderTotals(
      payload.services,
      productsList,
    );
    const paymentTerm = payload.paymentTerm ?? "A_VISTA";
    const paymentMethod = payload.paymentMethod?.trim() ? payload.paymentMethod.trim() : null;
    const openedAtDate = payload.openedAt
      ? new Date(`${payload.openedAt}T00:00:00`)
      : new Date();
    const dueDate =
      paymentTerm === "A_PRAZO" && payload.dueDate
        ? new Date(`${payload.dueDate}T00:00:00`)
        : openedAtDate;

    const multiParcel = Boolean(payload.installments && payload.installments.length >= 2);

    if (multiParcel) {
      const normalized = buildInstallmentsForBilling(totalAmount, dueDate, payload.installments);
      const parcelGroupId = randomUUID();
      const n = normalized.length;
      const splits = splitLaborProductsAcrossParcels(laborSubtotal, productsSubtotal, totalAmount, normalized);

      const ordersOut = await prisma.$transaction(async (tx) => {
        const results: { id: string; number: string }[] = [];
        let manualBase: string | null = null;

        for (let k = 0; k < n; k++) {
          const { labor: parcelLabor, products: parcelProducts } = splits[k];
          const parcelTotal = receivableAmount2(parcelLabor + parcelProducts);
          const scaledServices = scaleServiceItemsForParcel(payload.services, parcelLabor);
          const scaledProducts = scaleProductItemsForParcel(productsList, parcelProducts);

          let number: string;
          if (isStandalone) {
            number = await getNextAutoOrderNumber(tx, context.companyId);
          } else {
            if (!payload.customOsNumber) {
              throw new ServiceError("Informe um número de OS válido.", 400);
            }
            if (k === 0) {
              manualBase = await getManualOrderNumber(tx, context.companyId, payload.customOsNumber);
              number = manualBase;
            } else {
              number = `${manualBase}-P${k + 1}`;
              await assertOrderNumberFree(tx, context.companyId, number);
            }
          }

          const orderRow = await tx.serviceOrder.create({
            data: {
              companyId: context.companyId,
              unitId: payload.unitId,
              customerId: payload.customerId || null,
              customerNameSnapshot: payload.customerId ? null : payload.customerNameSnapshot || "Cliente avulso",
              number,
              openedAt: payload.openedAt ? new Date(`${payload.openedAt}T00:00:00`) : new Date(),
              dueDate: normalized[k].dueDate,
              paymentTerm,
              paymentMethod,
              notes: payload.notes || null,
              isStandalone,
              isBilled: false,
              totalAmount: parcelTotal,
              laborSubtotal: parcelLabor,
              productsSubtotal: parcelProducts,
              paymentStatus: "PENDENTE",
              createdByUserId: context.userId,
              updatedByUserId: context.userId,
              parcelGroupId,
              parcelIndex: k + 1,
              parcelCount: n,
              items: {
                create: scaledServices.map((service) => ({
                  serviceId: service.serviceId || null,
                  description: service.description,
                  quantity: service.quantity ?? 1,
                  laborPrice: service.laborPrice,
                  lineTotal: (service.quantity ?? 1) * service.laborPrice,
                  executedByUserId: service.executedByUserId?.trim() ? service.executedByUserId : null,
                  commissionRate: service.commissionRate ?? 12,
                })),
              },
            },
          });

          if (scaledProducts.length > 0) {
            await tx.serviceOrderProduct.createMany({
              data: scaledProducts.map((p, index) => ({
                companyId: context.companyId,
                serviceOrderId: orderRow.id,
                productId: p.productId || null,
                description: p.description,
                unit: (p.unit as ProductUnit) ?? "UN",
                quantity: p.quantity,
                unitPrice: p.unitPrice,
                totalPrice: p.quantity * p.unitPrice,
                sortOrder: index,
              })),
            });
          }

          await tx.auditLog.create({
            data: {
              companyId: context.companyId,
              unitId: orderRow.unitId,
              userId: context.userId,
              entityType: "service_order",
              entityId: orderRow.id,
              action: "CREATE",
              afterData: serviceOrderAfterDataForAudit(orderRow),
            },
          });

          results.push({ id: orderRow.id, number: orderRow.number });
        }

        return results;
      }, BILLING_INTERACTIVE_TX);

      const first = ordersOut[0];
      return {
        orderId: first.id,
        number: first.number,
        orders: ordersOut,
        parcelGroupId,
      };
    }

    const order = await prisma.$transaction(async (tx) => {
      let number: string;
      if (isStandalone) {
        number = await getNextAutoOrderNumber(tx, context.companyId);
      } else {
        if (!payload.customOsNumber) {
          throw new ServiceError("Informe um número de OS válido.", 400);
        }
        number = await getManualOrderNumber(tx, context.companyId, payload.customOsNumber);
      }

      const orderRow = await tx.serviceOrder.create({
        data: {
          companyId: context.companyId,
          unitId: payload.unitId,
          customerId: payload.customerId || null,
          customerNameSnapshot: payload.customerId ? null : payload.customerNameSnapshot || "Cliente avulso",
          number,
          openedAt: payload.openedAt ? new Date(`${payload.openedAt}T00:00:00`) : new Date(),
          dueDate,
          paymentTerm,
          paymentMethod,
          notes: payload.notes || null,
          isStandalone,
          isBilled: false,
          totalAmount,
          laborSubtotal,
          productsSubtotal,
          paymentStatus: "PENDENTE",
          createdByUserId: context.userId,
          updatedByUserId: context.userId,
          items: {
            create: payload.services.map((service) => ({
              serviceId: service.serviceId || null,
              description: service.description,
              quantity: service.quantity ?? 1,
              laborPrice: service.laborPrice,
              lineTotal: (service.quantity ?? 1) * service.laborPrice,
              executedByUserId: service.executedByUserId?.trim() ? service.executedByUserId : null,
              commissionRate: service.commissionRate ?? 12,
            })),
          },
        },
      });

      if (productsList.length > 0) {
        await tx.serviceOrderProduct.createMany({
          data: productsList.map((p, index) => ({
            companyId: context.companyId,
            serviceOrderId: orderRow.id,
            productId: p.productId || null,
            description: p.description,
            unit: (p.unit as ProductUnit) ?? "UN",
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            totalPrice: p.quantity * p.unitPrice,
            sortOrder: index,
          })),
        });
      }

      return orderRow;
    });

    await prisma.auditLog.create({
      data: {
        companyId: context.companyId,
        unitId: order.unitId,
        userId: context.userId,
        entityType: "service_order",
        entityId: order.id,
        action: "CREATE",
        afterData: serviceOrderAfterDataForAudit(order),
      },
    });

    return {
      orderId: order.id,
      number: order.number,
      orders: [{ id: order.id, number: order.number }],
    };
  },

  async updateStatus(id: string, statusLabel: string, context: ServiceOrderContext) {
    const mapped = mapStatusFilter(statusLabel);
    if (!mapped) {
      throw new ServiceError("Status inválido.", 400);
    }

    const existing = await getOrder(context.companyId, context.unitId, id);
    if (!existing) {
      throw new ServiceError("Ordem de serviço não encontrada.", 404);
    }

    const beforeStatusLabel = mapServiceOrderStatus(existing.status);

    await prisma.$transaction(async (tx) => {
      await tx.serviceOrder.update({
        where: { id: existing.id },
        data: {
          status: mapped,
          updatedByUserId: context.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId: context.companyId,
          unitId: existing.unitId,
          userId: context.userId,
          entityType: "service_order",
          entityId: existing.id,
          action: "STATUS_CHANGE",
          beforeData: { status: beforeStatusLabel },
          afterData: { status: statusLabel },
        },
      });
    });

    return {
      order: {
        id: existing.id,
        status: mapServiceOrderStatus(mapped),
        paymentStatus: existing.paymentStatus,
      },
    };
  },

  async update(id: string, payload: UpdateOrderPayload, context: ServiceOrderContext) {
    const existing = await getOrder(context.companyId, context.unitId, id);

    if (!existing) {
      throw new ServiceError("Ordem de serviço não encontrada.", 404);
    }

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    if (payload.mode === "edit") {
      if (payload.customerId) {
        await ensureCustomerExists(payload.customerId, context.companyId);
      }

      const services = payload.services ?? [];
      const productsList = payload.products ?? [];
      const { laborSubtotal, productsSubtotal, totalAmount } = calcOrderTotals(
        services,
        productsList,
      );
      const paymentTerm = payload.paymentTerm ?? existing.paymentTerm ?? "A_VISTA";
      const paymentMethod = payload.paymentMethod?.trim() ? payload.paymentMethod.trim() : null;
      const dueDate =
        paymentTerm === "A_PRAZO" && payload.dueDate ? new Date(`${payload.dueDate}T00:00:00`) : new Date();

      const updated = await db.$transaction(async (tx) => {
        const nextOrderNumber =
          payload.customOsNumber && payload.customOsNumber > 0
            ? await resolveOrderNumberForManualEdit(tx, context.companyId, payload.customOsNumber, {
                id: existing.id,
                number: existing.number,
                parcelGroupId: existing.parcelGroupId,
                parcelIndex: existing.parcelIndex,
              })
            : existing.number;

        await tx.serviceOrderItem.deleteMany({
          where: { serviceOrderId: existing.id },
        });

        await tx.serviceOrderProduct.deleteMany({
          where: { serviceOrderId: existing.id },
        });

        const billingPlanPatch =
          existing.isBilled || payload.installments === undefined
            ? {}
            : !payload.installments || payload.installments.length < 2
              ? { billingInstallmentPlan: Prisma.JsonNull }
              : {
                  billingInstallmentPlan: installmentPlanToJson(
                    buildInstallmentsForBilling(totalAmount, dueDate, payload.installments),
                  ),
                };

        const order = await tx.serviceOrder.update({
          where: { id: existing.id },
          data: {
            customerId: payload.customerId || null,
            unitId: existing.unitId,
            customerNameSnapshot: payload.customerId ? null : payload.customerNameSnapshot || "Cliente avulso",
            number: nextOrderNumber,
            dueDate,
            paymentTerm,
            paymentMethod,
            notes: payload.notes || null,
            isStandalone: !payload.customerId,
            totalAmount,
            laborSubtotal,
            productsSubtotal,
            updatedByUserId: context.userId,
            ...billingPlanPatch,
            items: {
              create: services.map((service) => ({
                serviceId: service.serviceId || null,
                description: service.description,
                quantity: service.quantity ?? 1,
                laborPrice: service.laborPrice,
                lineTotal: (service.quantity ?? 1) * service.laborPrice,
                executedByUserId: service.executedByUserId?.trim() ? service.executedByUserId : null,
                commissionRate: service.commissionRate ?? 12,
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
            items: {
              select: {
                id: true,
                serviceId: true,
                description: true,
                referencedOrderNumber: true,
                quantity: true,
                laborPrice: true,
                lineTotal: true,
                previousOrderStatus: true,
                executedByUserId: true,
                executedBy: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            products: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                productId: true,
                description: true,
                unit: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                sortOrder: true,
              },
            },
            receivables: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                status: true,
                amount: true,
                dueDate: true,
              },
            },
          },
        });

        if (productsList.length > 0) {
          await tx.serviceOrderProduct.createMany({
            data: productsList.map((p, index) => ({
              companyId: context.companyId,
              serviceOrderId: existing.id,
              productId: p.productId || null,
              description: p.description,
              unit: (p.unit as ProductUnit) ?? "UN",
              quantity: p.quantity,
              unitPrice: p.unitPrice,
              totalPrice: p.quantity * p.unitPrice,
              sortOrder: index,
            })),
          });
        }

        await tx.accountReceivable.updateMany({
          where: {
            serviceOrderId: existing.id,
            originType: "SERVICE_ORDER",
          },
          data: {
            customerId: payload.customerId || null,
            unitId: existing.unitId,
            amount: totalAmount,
            dueDate,
            description: nextOrderNumber,
          },
        });

        return order;
      });

      return { order: mapOrder(updated) };
    }

    if (payload.mode === "bill") {
      if (existing.isBilled) {
        throw new ServiceError("Esta OS já foi faturada.", 400);
      }

      const effectivePaymentTerm =
        payload.paymentTerm === "A_VISTA" || payload.paymentTerm === "A_PRAZO"
          ? payload.paymentTerm
          : existing.paymentTerm ?? "A_VISTA";
      const trimmedDue = payload.dueDate?.trim();
      let effectiveDueDate: Date;
      if (trimmedDue && /^\d{4}-\d{2}-\d{2}$/.test(trimmedDue)) {
        effectiveDueDate = new Date(`${trimmedDue}T00:00:00`);
      } else if (effectivePaymentTerm === "A_PRAZO") {
        effectiveDueDate = existing.dueDate ?? existing.openedAt;
      } else {
        effectiveDueDate = existing.openedAt;
      }
      const trimmedMethod = payload.paymentMethod?.trim();
      const effectivePaymentMethod =
        trimmedMethod !== undefined && trimmedMethod !== null && trimmedMethod.length > 0
          ? trimmedMethod
          : (existing.paymentMethod ?? "");
      const installmentPayload = resolveInstallmentPayloadForBill(
        existing.billingInstallmentPlan,
        payload.installments,
      );
      const installmentPlan = buildInstallmentsForBilling(
        Number(existing.totalAmount),
        effectiveDueDate,
        installmentPayload,
      );
      const orderDueDate = installmentPlan[0]?.dueDate ?? effectiveDueDate;

      if (existing.number.startsWith("FEC-")) {
        const fecTotalAmount = Number(existing.totalAmount);
        if (!Number.isFinite(fecTotalAmount) || fecTotalAmount <= 0) {
          throw new ServiceError("Total do fechamento inválido para faturamento.", 400);
        }

        const sourceNumbers = getReferencedOrderNumbersFromFecItems(existing.items);
        if (!sourceNumbers.length) {
          throw new ServiceError("Nenhuma OS de origem encontrada no fechamento.", 400);
        }

        const uniqueNumbers = Array.from(new Set(sourceNumbers));
        const fecContributionByOrder = aggregateFecLineContributionsByOrderNumber(existing.items);
        const plannedIncludedByOrder = plannedParcelIndicesFromFecItems(existing.items);
        let updated;
        try {
          updated = await db.$transaction(async (tx) => {
          const sourceOrders = await tx.serviceOrder.findMany({
            where: {
              companyId: context.companyId,
              ...(context.unitId ? { unitId: context.unitId } : {}),
              number: { in: uniqueNumbers },
            },
            select: {
              id: true,
              unitId: true,
              number: true,
              customerId: true,
              openedAt: true,
              dueDate: true,
              totalAmount: true,
              isBilled: true,
              billingInstallmentPlan: true,
            },
          });

          if (sourceOrders.length !== uniqueNumbers.length) {
            throw new ServiceError("Alguma OS de origem do fechamento não foi encontrada.", 400);
          }

          await lockServiceOrdersByIdForUpdate(tx, [existing.id, ...sourceOrders.map((o) => o.id)]);

          const fecAfterLock = await tx.serviceOrder.findFirst({
            where: {
              id: existing.id,
              companyId: context.companyId,
              ...(context.unitId ? { unitId: context.unitId } : {}),
            },
            select: { isBilled: true },
          });
          if (!fecAfterLock) {
            throw new ServiceError("Ordem de serviço não encontrada.", 404);
          }
          if (fecAfterLock.isBilled) {
            throw new ServiceError("Esta OS já foi faturada.", 400);
          }

          const sourceOrdersAfterLock = await tx.serviceOrder.findMany({
            where: {
              companyId: context.companyId,
              ...(context.unitId ? { unitId: context.unitId } : {}),
              number: { in: uniqueNumbers },
            },
            select: {
              id: true,
              unitId: true,
              number: true,
              customerId: true,
              openedAt: true,
              dueDate: true,
              totalAmount: true,
              isBilled: true,
              billingInstallmentPlan: true,
            },
          });

          for (const child of sourceOrdersAfterLock) {
            if (child.isBilled) {
              continue;
            }
            const childShare = fecContributionByOrder.get(child.number) ?? 0;
            if (childShare <= 0) {
              continue;
            }
            const childPreBill = await tx.accountReceivable.findMany({
              where: {
                serviceOrderId: child.id,
                originType: "SERVICE_ORDER",
              },
              select: { id: true },
            });
            if (childPreBill.length > 0) {
              throw new ServiceError(
                `A OS ${child.number} já possui recebível de faturamento. Atualize a página antes de faturar o fechamento.`,
                409,
              );
            }
            const installmentGroupId = installmentPlan.length > 1 ? crypto.randomUUID() : null;
            const childReceivables = [];
            for (let index = 0; index < installmentPlan.length; index += 1) {
              const part = installmentPlan[index];
              childReceivables.push(
                await tx.accountReceivable.create({
                  data: {
                    companyId: context.companyId,
                    unitId: child.unitId,
                    customerId: child.customerId || null,
                    serviceOrderId: child.id,
                    lineSlot: index,
                    originType: "SERVICE_ORDER",
                    description:
                      installmentPlan.length > 1
                        ? `${child.number} (${index + 1}/${installmentPlan.length})`
                        : child.number,
                    amount: receivableAmount2((childShare * part.amount) / fecTotalAmount),
                    dueDate: part.dueDate,
                    status: "PENDENTE",
                    paidAt: null,
                    installmentGroupId,
                    installmentNumber: installmentPlan.length > 1 ? index + 1 : null,
                    installmentCount: installmentPlan.length > 1 ? installmentPlan.length : null,
                  },
                }),
              );
            }

            const orderTotalCents = Math.round(Number(child.totalAmount) * 100);
            const receivableRows = await tx.accountReceivable.findMany({
              where: {
                serviceOrderId: child.id,
                originType: "SERVICE_ORDER",
              },
              select: { amount: true },
            });
            const receivableSumCents = receivableRows.reduce(
              (sum, r) => sum + Math.round(Number(r.amount) * 100),
              0,
            );
            const isFullyBilled = receivableSumCents >= orderTotalCents - 1;

            const rawPlan = parseStoredBillingPlan(child.billingInstallmentPlan);
            const includedPlanned = plannedIncludedByOrder.get(child.number);
            let nextPlan: OrderInstallmentPayload[] | null = null;
            if (isFullyBilled) {
              nextPlan = null;
            } else if (rawPlan && includedPlanned && includedPlanned.size > 0) {
              nextPlan = trimBillingPlanRemovingParcelIndices(rawPlan, includedPlanned);
              if (nextPlan.length === 0) {
                nextPlan = null;
              }
            } else if (rawPlan && childShare + 1e-6 < Number(child.totalAmount)) {
              nextPlan = null;
            } else if (rawPlan) {
              nextPlan = rawPlan;
            }

            await tx.serviceOrder.update({
              where: { id: child.id },
              data: {
                isBilled: isFullyBilled,
                billingInstallmentPlan:
                  isFullyBilled || !nextPlan?.length ? Prisma.JsonNull : orderInstallmentPayloadsToJson(nextPlan),
                ...(isFullyBilled
                  ? {
                      dueDate: orderDueDate,
                      paymentTerm: effectivePaymentTerm,
                      paymentMethod: effectivePaymentMethod || null,
                    }
                  : {}),
                updatedByUserId: context.userId,
              },
            });

            await tx.auditLog.create({
              data: {
                companyId: context.companyId,
                unitId: child.unitId,
                userId: context.userId,
                entityType: "receivable",
                entityId: childReceivables[0]?.id ?? child.id,
                action: "CREATE",
                afterData: receivableAfterDataForAudit(childReceivables[0]),
              },
            });
          }

          await tx.serviceOrder.update({
            where: { id: existing.id },
            data: {
              isBilled: true,
              dueDate: orderDueDate,
              paymentTerm: effectivePaymentTerm,
              paymentMethod: effectivePaymentMethod || null,
              updatedByUserId: context.userId,
            },
          });

          const order = await tx.serviceOrder.findFirst({
            where: { id: existing.id },
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
              items: {
                select: {
                  id: true,
                  serviceId: true,
                  description: true,
                  referencedOrderNumber: true,
                  quantity: true,
                  laborPrice: true,
                  lineTotal: true,
                  previousOrderStatus: true,
                  executedByUserId: true,
                  executedBy: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              products: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  productId: true,
                  description: true,
                  unit: true,
                  quantity: true,
                  unitPrice: true,
                  totalPrice: true,
                  sortOrder: true,
                },
              },
              receivables: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  status: true,
                  amount: true,
                  dueDate: true,
                },
              },
            },
          });

          if (!order) {
            throw new ServiceError("Ordem de serviço não encontrada.", 404);
          }

          return order;
        }, BILLING_INTERACTIVE_TX);
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            throw new ServiceError("Esta OS já possui recebível de faturamento registrado.", 409);
          }
          throw error;
        }

        return { order: mapOrder(updated) };
      }

      let updated;
      try {
        updated = await db.$transaction(async (tx) => {
        await lockServiceOrdersByIdForUpdate(tx, [existing.id]);
        const orderAfterLock = await tx.serviceOrder.findFirst({
          where: {
            id: existing.id,
            companyId: context.companyId,
            ...(context.unitId ? { unitId: context.unitId } : {}),
          },
          select: { isBilled: true },
        });
        if (!orderAfterLock) {
          throw new ServiceError("Ordem de serviço não encontrada.", 404);
        }
        if (orderAfterLock.isBilled) {
          throw new ServiceError("Esta OS já foi faturada.", 400);
        }

        const preBillReceivables = await tx.accountReceivable.findMany({
          where: {
            serviceOrderId: existing.id,
            originType: "SERVICE_ORDER",
          },
          select: { id: true, lineSlot: true },
        });
        if (preBillReceivables.length > 0) {
          throw new ServiceError(
            "Esta OS já possui recebível de faturamento vinculado. Atualize a página. Se a OS não estiver como faturada, pode haver inconsistência — evite clicar duas vezes em Faturar.",
            409,
          );
        }

        const installmentGroupId = installmentPlan.length > 1 ? crypto.randomUUID() : null;
        const createdReceivables = [];
        for (let index = 0; index < installmentPlan.length; index += 1) {
          const part = installmentPlan[index];
          createdReceivables.push(
            await tx.accountReceivable.create({
              data: {
                companyId: context.companyId,
                unitId: existing.unitId,
                customerId: existing.customerId || null,
                serviceOrderId: existing.id,
                lineSlot: index,
                originType: "SERVICE_ORDER",
                description:
                  installmentPlan.length > 1
                    ? `${existing.number} (${index + 1}/${installmentPlan.length})`
                    : existing.number,
                amount: receivableAmount2(part.amount),
                dueDate: part.dueDate,
                status: "PENDENTE",
                paidAt: null,
                installmentGroupId,
                installmentNumber: installmentPlan.length > 1 ? index + 1 : null,
                installmentCount: installmentPlan.length > 1 ? installmentPlan.length : null,
              },
            }),
          );
        }

        await tx.serviceOrder.update({
          where: { id: existing.id },
          data: {
            isBilled: true,
            dueDate: orderDueDate,
            paymentTerm: effectivePaymentTerm,
            paymentMethod: effectivePaymentMethod || null,
            updatedByUserId: context.userId,
          },
        });

        await tx.auditLog.create({
          data: {
            companyId: context.companyId,
            unitId: existing.unitId,
            userId: context.userId,
            entityType: "receivable",
            entityId: createdReceivables[0]?.id ?? existing.id,
            action: "CREATE",
            afterData: receivableAfterDataForAudit(createdReceivables[0]),
          },
        });

        const order = await tx.serviceOrder.findFirst({
          where: { id: existing.id },
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
            items: {
              select: {
                id: true,
                serviceId: true,
                description: true,
                referencedOrderNumber: true,
                quantity: true,
                laborPrice: true,
                lineTotal: true,
                previousOrderStatus: true,
                executedByUserId: true,
                executedBy: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            products: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                productId: true,
                description: true,
                unit: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                sortOrder: true,
              },
            },
            receivables: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                status: true,
                amount: true,
                dueDate: true,
              },
            },
          },
        });

        if (!order) {
          throw new ServiceError("Ordem de serviço não encontrada.", 404);
        }

        return order;
      }, BILLING_INTERACTIVE_TX);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ServiceError("Esta OS já possui recebível de faturamento registrado.", 409);
        }
        throw error;
      }

      return { order: mapOrder(updated) };
    }

    if (payload.mode === "unbill") {
      if (!existing.isBilled) {
        throw new ServiceError("Esta OS ainda não foi faturada.", 400);
      }

      if (!existing.number.startsWith("FEC-")) {
        const lockedNumbers = await fetchReferencedOrderNumbersInOpenClosures(context.companyId, existing.unitId);
        if (lockedNumbers.has(existing.number)) {
          throw new ServiceError(
            "Esta OS está vinculada a um fechamento em aberto. Exclua ou baixe o fechamento antes de cancelar o faturamento.",
            400,
          );
        }
      }

      const hasPaidReceivable = existing.receivables.some((item) => item.status === "PAGO");
      if (hasPaidReceivable || existing.paymentStatus === "PAGO") {
        throw new ServiceError(
          "Não é possível cancelar o faturamento enquanto a OS está baixada. Reabra o pagamento primeiro (menu da OS) e tente novamente.",
          400,
        );
      }

      const updated = await db.$transaction(async (tx) => {
        if (existing.number.startsWith("FEC-")) {
          const childNumbers = Array.from(
            new Set(getReferencedOrderNumbersFromFecItems(existing.items)),
          );
          if (childNumbers.length) {
            const children = await tx.serviceOrder.findMany({
              where: {
                companyId: context.companyId,
                number: { in: childNumbers },
              },
              include: {
                receivables: {
                  select: { status: true },
                },
              },
            });

            for (const ch of children) {
              if (ch.receivables.some((r) => r.status === "PAGO")) {
                throw new ServiceError(
                  "Não é possível cancelar o faturamento do fechamento com OS filha já paga.",
                  400,
                );
              }
            }

            const childIds = children.map((c) => c.id);
            const childReceivables = await tx.accountReceivable.findMany({
              where: {
                serviceOrderId: { in: childIds },
                originType: "SERVICE_ORDER",
              },
            });
            for (const rec of childReceivables) {
              await tx.auditLog.create({
                data: {
                  companyId: context.companyId,
                  unitId: rec.unitId,
                  userId: context.userId,
                  entityType: "receivable",
                  entityId: rec.id,
                  action: "DELETE",
                  beforeData: receivableAfterDataForAudit(rec),
                },
              });
            }
            for (const ch of children) {
              await tx.accountReceivable.deleteMany({
                where: {
                  serviceOrderId: ch.id,
                  originType: "SERVICE_ORDER",
                },
              });
              await tx.serviceOrder.update({
                where: { id: ch.id },
                data: {
                  isBilled: false,
                  paymentStatus: "PENDENTE",
                  updatedByUserId: context.userId,
                },
              });
            }
          }
        }

        const ownReceivables = await tx.accountReceivable.findMany({
          where: {
            serviceOrderId: existing.id,
            originType: "SERVICE_ORDER",
          },
        });
        for (const rec of ownReceivables) {
          await tx.auditLog.create({
            data: {
              companyId: context.companyId,
              unitId: rec.unitId,
              userId: context.userId,
              entityType: "receivable",
              entityId: rec.id,
              action: "DELETE",
              beforeData: receivableAfterDataForAudit(rec),
            },
          });
        }

        await tx.accountReceivable.deleteMany({
          where: {
            serviceOrderId: existing.id,
            originType: "SERVICE_ORDER",
          },
        });

        await tx.serviceOrder.update({
          where: { id: existing.id },
          data: {
            isBilled: false,
            paymentStatus: "PENDENTE",
            updatedByUserId: context.userId,
          },
        });

        const order = await tx.serviceOrder.findFirst({
          where: { id: existing.id },
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
            items: {
              select: {
                id: true,
                serviceId: true,
                description: true,
                referencedOrderNumber: true,
                quantity: true,
                laborPrice: true,
                lineTotal: true,
                previousOrderStatus: true,
                executedByUserId: true,
                executedBy: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            products: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                productId: true,
                description: true,
                unit: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                sortOrder: true,
              },
            },
            receivables: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                status: true,
                amount: true,
                dueDate: true,
              },
            },
          },
        });

        if (!order) {
          throw new ServiceError("Ordem de serviço não encontrada.", 404);
        }

        return order;
      });

      return { order: mapOrder(updated) };
    }

    if (!existing.isBilled && payload.mode === "settle") {
      throw new ServiceError("Fature a OS antes de registrar o pagamento.", 400);
    }

    if (payload.mode === "settle" && !existing.number.startsWith("FEC-")) {
      const lockedNumbers = await fetchReferencedOrderNumbersInOpenClosures(context.companyId, existing.unitId);
      if (lockedNumbers.has(existing.number)) {
        throw new ServiceError(
          "Esta OS está vinculada a um fechamento em aberto. Baixe o fechamento antes de baixar esta OS.",
          400,
        );
      }
    }

    if (payload.mode === "reopen" && !existing.number.startsWith("FEC-")) {
      const lockedNumbers = await fetchReferencedOrderNumbersInOpenClosures(context.companyId, existing.unitId);
      if (lockedNumbers.has(existing.number)) {
        throw new ServiceError(
          "Esta OS está vinculada a um fechamento em aberto. Baixe ou reabra o fechamento antes de reabrir o pagamento desta OS.",
          400,
        );
      }
      if (!existing.isBilled) {
        throw new ServiceError("Não há faturamento registrado para reabrir o pagamento.", 400);
      }
      if (existing.paymentStatus === "PAGO_PARCIAL") {
        throw new ServiceError(
          "Reabrir pagamento de OS comum com baixa parcial não está disponível. Entre em contato com o suporte se precisar corrigir.",
          400,
        );
      }
      const paidLike =
        existing.paymentStatus === "PAGO" ||
        existing.receivables.some((r) => r.status === "PAGO");
      if (!paidLike) {
        throw new ServiceError(
          "Só é possível reabrir o pagamento quando a OS está baixada (paga).",
          400,
        );
      }
    }

    const receivable = existing.receivables[0] ?? null;
    const closureOutstandingAmount = fecOutstandingFromItems(existing.items);
    const isPartialPayment =
      existing.number.startsWith("FEC-") &&
      payload.mode === "settle" &&
      (payload.partialAmount ?? 0) > 0 &&
      (payload.partialAmount ?? 0) < closureOutstandingAmount;

    if (!existing.number.startsWith("FEC-") && !receivable) {
      throw new ServiceError("Recebível vinculado não encontrado.", 404);
    }

    if (existing.number.startsWith("FEC-") && !receivable && isPartialPayment) {
      throw new ServiceError(
        "Baixa parcial não está disponível para fechamento sem recebível na OS de fechamento (somente baixa total).",
        400,
      );
    }

    const targetStatus = payload.mode === "settle" ? "PAGO" : "PENDENTE";

    const appliedDiscount =
      existing.number.startsWith("FEC-") && payload.mode === "settle" && !isPartialPayment
        ? Math.min(payload.discountAmount ?? 0, closureOutstandingAmount)
        : 0;

    const closureSettledAmount = isPartialPayment
      ? payload.partialAmount!
      : Math.max(closureOutstandingAmount - appliedDiscount, 0);

    const remainingAmount = isPartialPayment ? closureOutstandingAmount - closureSettledAmount : 0;

    const fecOrderStatus =
      payload.mode === "reopen"
        ? "ABERTA"
        : existing.status;

    const newPaymentStatus: PaymentStatus =
      payload.mode === "settle"
        ? isPartialPayment
          ? "PAGO_PARCIAL"
          : "PAGO"
        : "PENDENTE";

    const isRegularReopen = payload.mode === "reopen" && !existing.number.startsWith("FEC-");

    const updated = await db.$transaction(async (tx) => {
      if (isRegularReopen) {
        await tx.accountReceivable.updateMany({
          where: {
            serviceOrderId: existing.id,
            originType: "SERVICE_ORDER",
          },
          data: {
            status: "PENDENTE",
            paidAt: null,
          },
        });
        await tx.accountReceivable.deleteMany({
          where: {
            serviceOrderId: existing.id,
            originType: "SERVICE_ORDER",
            lineSlot: { gt: 0 },
            installmentGroupId: null,
          },
        });
      } else if (!existing.number.startsWith("FEC-")) {
        if (payload.mode === "settle") {
          await tx.accountReceivable.updateMany({
            where: {
              serviceOrderId: existing.id,
              originType: "SERVICE_ORDER",
            },
            data: {
              status: "PAGO",
              paidAt: new Date(),
            },
          });
        } else if (receivable) {
          await tx.accountReceivable.update({
            where: { id: receivable.id },
            data: {
              status: targetStatus,
              paidAt: null,
            },
          });
        }
      } else if (receivable) {
        await tx.accountReceivable.update({
          where: { id: receivable.id },
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

        if (isPartialPayment && remainingAmount > 0) {
          await tx.accountReceivable.create({
            data: {
              companyId: context.companyId,
              unitId: existing.unitId || null,
              customerId: existing.customerId || null,
              serviceOrderId: existing.id,
              lineSlot: 1,
              originType: "SERVICE_ORDER",
              description: `Pendência de ${existing.number}`,
              amount: remainingAmount,
              dueDate: existing.dueDate ?? new Date(),
              status: "PENDENTE",
              installmentGroupId: null,
              installmentNumber: null,
              installmentCount: null,
            },
          });
        }
      }

      if (existing.number.startsWith("FEC-")) {
        const sourceNumbers = getReferencedOrderNumbersFromFecItems(existing.items);
        const reopenableSourceNumbers = getReferencedOrderNumbersFromFecItems(
          existing.items.filter(
            (item) =>
              !item.description.toLowerCase().includes("ja pago") &&
              !item.description.includes("já pago") &&
              !item.description.includes("jÃ¡ pago"),
          ),
        );
        const effectiveSourceNumbers = payload.mode === "reopen" ? reopenableSourceNumbers : sourceNumbers;
        const sourceReceivableStatus = payload.mode === "settle" && !isPartialPayment ? "PAGO" : "PENDENTE";
        const sourcePaymentStatus: PaymentStatus = payload.mode === "settle" && !isPartialPayment ? "PAGO" : "PENDENTE";

        if (effectiveSourceNumbers.length) {
          const sourceOrders = await tx.serviceOrder.findMany({
            where: {
              companyId: context.companyId,
              ...(context.unitId ? { unitId: context.unitId } : {}),
              number: { in: effectiveSourceNumbers },
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
              items: {
                select: {
                  previousOrderStatus: true,
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
                status: sourceReceivableStatus,
                paidAt: sourceReceivableStatus === "PAGO" ? new Date() : null,
              },
            });
          }

          if (sourceOrderIds.length) {
            if (payload.mode === "reopen") {
              const previousStatusByNumber = new Map<string, ServiceOrderStatus>();
              for (const item of existing.items) {
                for (const num of fecLineReferencedOrderNumbers(item)) {
                  if (!previousStatusByNumber.has(num)) {
                    previousStatusByNumber.set(num, item.previousOrderStatus ?? "ABERTA");
                  }
                }
              }

              for (const sourceOrder of sourceOrders) {
                await tx.serviceOrder.update({
                  where: { id: sourceOrder.id },
                  data: {
                    status: previousStatusByNumber.get(sourceOrder.number) ?? "ABERTA",
                    paymentStatus: "PENDENTE",
                    closedAt: null,
                    updatedByUserId: context.userId,
                  },
                });
              }
            } else {
              await tx.serviceOrder.updateMany({
                where: {
                  id: {
                    in: sourceOrderIds,
                  },
                },
                data: {
                  status: "CONCLUIDA",
                  paymentStatus: sourcePaymentStatus,
                  closedAt: sourcePaymentStatus === "PAGO" ? new Date() : null,
                  updatedByUserId: context.userId,
                },
              });
            }
          }
        }

        return tx.serviceOrder.update({
          where: { id: existing.id },
          data: {
            status: fecOrderStatus,
            paymentStatus: newPaymentStatus,
            paymentMethod:
              payload.mode === "settle" && payload.paymentMethod?.trim().length
                ? payload.paymentMethod.trim()
                : undefined,
            updatedByUserId: context.userId,
            closedAt: payload.mode === "settle" && !isPartialPayment ? new Date() : null,
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
            items: {
              select: {
                id: true,
                serviceId: true,
                description: true,
                referencedOrderNumber: true,
                quantity: true,
                laborPrice: true,
                lineTotal: true,
                previousOrderStatus: true,
                executedByUserId: true,
                executedBy: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            products: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                productId: true,
                description: true,
                unit: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                sortOrder: true,
              },
            },
            receivables: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                status: true,
                amount: true,
                dueDate: true,
              },
            },
          },
        });
      }

      await tx.serviceOrder.update({
        where: { id: existing.id },
        data: {
          paymentStatus: newPaymentStatus,
          paymentMethod:
            payload.mode === "settle" && payload.paymentMethod?.trim().length
              ? payload.paymentMethod.trim()
              : undefined,
          updatedByUserId: context.userId,
          ...(payload.mode === "reopen" && !existing.number.startsWith("FEC-") ? { closedAt: null } : {}),
        },
      });

      const order = await tx.serviceOrder.findFirst({
        where: { id: existing.id },
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
          items: {
            select: {
              id: true,
              serviceId: true,
              description: true,
              referencedOrderNumber: true,
              quantity: true,
              laborPrice: true,
              lineTotal: true,
              previousOrderStatus: true,
              executedByUserId: true,
              executedBy: {
                select: {
                  name: true,
                },
              },
            },
          },
          products: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              productId: true,
              description: true,
              unit: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              sortOrder: true,
            },
          },
          receivables: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              status: true,
              amount: true,
              dueDate: true,
            },
          },
        },
      });

      if (!order) {
        throw new ServiceError("Ordem de serviço não encontrada.", 404);
      }

      return order;
    }, { timeout: 30000 });

    return { order: mapOrder(updated) };
  },

  async remove(id: string, context: ServiceOrderContext) {
    const existing = await getOrder(context.companyId, context.unitId, id);

    if (!existing) {
      throw new ServiceError("Ordem de serviço não encontrada.", 404);
    }

    const hasPaidReceivable = existing.receivables.some((item) => item.status === "PAGO");
    if (hasPaidReceivable) {
      throw new ServiceError("Não é possível excluir uma OS com recebimento já baixado.", 400);
    }

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    await db.$transaction(async (tx) => {
      await tx.accountReceivable.deleteMany({
        where: { serviceOrderId: existing.id },
      });

      await tx.serviceOrder.delete({
        where: { id: existing.id },
      });
    });

    return { ok: true };
  },
};


