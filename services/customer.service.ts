import { mapCustomerToClient, mapServiceOrderStatus } from "@/lib/db-mappers";
import { isValidCnpj, isValidCpf } from "@/lib/document-validators";
import { getAuditPrisma } from "@/lib/prisma-audit";
import { prisma } from "@/lib/prisma";
import { normalizeSearch } from "@/lib/search-helpers";
import { ServiceError } from "@/services/service-error";
import { Prisma } from "@prisma/client";

type CustomerPayload = {
  tipo: "pf" | "pj";
  situacao: "Ativo" | "Inativo";
  celular: string;
  whatsapp?: string;
  email?: string | null;
  observacoes?: string;
  nomeCompleto?: string;
  cpf?: string;
  dataNascimento?: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj?: string;
};

type CustomerContext = {
  companyId: string;
  unitId?: string;
  userId: string;
};

type CustomerListParams = {
  page?: number;
  limit?: number;
  search?: string;
};

function mapStatus(status: "Ativo" | "Inativo"): "ATIVO" | "INATIVO" {
  return status === "Ativo" ? "ATIVO" : "INATIVO";
}

function mapType(type: "pf" | "pj"): "PF" | "PJ" {
  return type === "pf" ? "PF" : "PJ";
}

function validateDocument(payload: CustomerPayload) {
  const cpf = payload.cpf?.trim();
  const cnpj = payload.cnpj?.trim();

  if (payload.tipo === "pf" && cpf && !isValidCpf(cpf)) {
    throw new ServiceError("CPF inválido.", 400);
  }

  if (payload.tipo === "pj" && cnpj && !isValidCnpj(cnpj)) {
    throw new ServiceError("CNPJ inválido.", 400);
  }
}

function buildCustomerData(payload: CustomerPayload) {
  validateDocument(payload);

  return {
    type: mapType(payload.tipo),
    status: mapStatus(payload.situacao),
    phone: payload.celular,
    whatsapp: payload.whatsapp || payload.celular,
    email: payload.email || null,
    notes: payload.observacoes || null,
    fullName: payload.tipo === "pf" ? payload.nomeCompleto || null : null,
    cpf: payload.tipo === "pf" ? payload.cpf || null : null,
    birthDate: payload.tipo === "pf" && payload.dataNascimento ? new Date(`${payload.dataNascimento}T00:00:00`) : null,
    tradeName: payload.tipo === "pj" ? payload.nomeFantasia || null : null,
    legalName: payload.tipo === "pj" ? payload.razaoSocial || null : null,
    cnpj: payload.tipo === "pj" ? payload.cnpj || null : null,
  };
}

async function buildWhere(companyId: string, search?: string): Promise<Prisma.CustomerWhereInput> {
  const trimmed = search?.trim();

  if (!trimmed) {
    return { companyId };
  }

  const pattern = `%${normalizeSearch(trimmed)}%`;

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT DISTINCT c."id"
    FROM "Customer" c
    WHERE c."companyId" = ${companyId}
      AND (
        unaccent(LOWER(COALESCE(c."fullName", ''))) LIKE unaccent(LOWER(${pattern}::text))
        OR unaccent(LOWER(COALESCE(c."tradeName", ''))) LIKE unaccent(LOWER(${pattern}::text))
        OR unaccent(LOWER(COALESCE(c."legalName", ''))) LIKE unaccent(LOWER(${pattern}::text))
        OR unaccent(LOWER(COALESCE(c."cpf", ''))) LIKE unaccent(LOWER(${pattern}::text))
        OR unaccent(LOWER(COALESCE(c."cnpj", ''))) LIKE unaccent(LOWER(${pattern}::text))
        OR unaccent(LOWER(COALESCE(c."phone", ''))) LIKE unaccent(LOWER(${pattern}::text))
        OR unaccent(LOWER(COALESCE(c."whatsapp", ''))) LIKE unaccent(LOWER(${pattern}::text))
        OR unaccent(LOWER(COALESCE(c."email", ''))) LIKE unaccent(LOWER(${pattern}::text))
      )
  `);

  const ids = rows.map((row) => row.id);

  return {
    companyId,
    id: { in: ids.length > 0 ? ids : [] },
  };
}

export const customerService = {
  async list(context: Pick<CustomerContext, "companyId">, params?: CustomerListParams) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 10;
    const where = await buildWhere(context.companyId, params?.search);
    const skip = (page - 1) * limit;

    const [total, customers] = await prisma.$transaction([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      data: customers.map(mapCustomerToClient),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  },

  async getById(id: string, context: Pick<CustomerContext, "companyId" | "unitId">) {
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        companyId: context.companyId,
      },
      include: {
        serviceOrders: {
          where: context.unitId ? { unitId: context.unitId } : {},
          orderBy: { openedAt: "desc" },
          take: 5,
          select: {
            id: true,
            number: true,
            status: true,
            totalAmount: true,
            openedAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new ServiceError("Cliente nao encontrado.", 404);
    }

    return {
      customer: mapCustomerToClient(customer),
      latestOrders: customer.serviceOrders.map((order) => ({
        id: order.id,
        number: order.number,
        status: mapServiceOrderStatus(order.status),
        total: Number(order.totalAmount),
        openedAt: order.openedAt.toISOString().slice(0, 10),
      })),
    };
  },

  async create(payload: CustomerPayload, context: CustomerContext) {
    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    const customer = await db.customer.create({
      data: {
        companyId: context.companyId,
        ...buildCustomerData(payload),
      },
    });

    return { customer: mapCustomerToClient(customer) };
  },

  async update(id: string, payload: CustomerPayload, context: CustomerContext) {
    const existing = await prisma.customer.findFirst({
      where: {
        id,
        companyId: context.companyId,
      },
    });

    if (!existing) {
      throw new ServiceError("Cliente nao encontrado.", 404);
    }

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    const customer = await db.customer.update({
      where: { id },
      data: buildCustomerData(payload),
    });

    return { customer: mapCustomerToClient(customer) };
  },

  async delete(id: string, context: CustomerContext) {
    const existing = await prisma.customer.findFirst({
      where: { id, companyId: context.companyId },
    });

    if (!existing) {
      throw new ServiceError("Cliente não encontrado.", 404);
    }

    const displayName =
      existing.type === "PF"
        ? existing.fullName ?? existing.cpf ?? "Cliente"
        : existing.tradeName ?? existing.legalName ?? "Cliente";

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    await prisma.$transaction([
      prisma.serviceOrder.updateMany({
        where: { customerId: id, companyId: context.companyId },
        data: { customerNameSnapshot: displayName },
      }),
      db.customer.delete({ where: { id } }),
    ]);
  },
};
