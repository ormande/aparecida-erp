import { mapSupplierToAppSupplier } from "@/lib/db-mappers";
import { getAuditPrisma } from "@/lib/prisma-audit";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/services/service-error";

type SupplierPayload = {
  tipo: "pf" | "pj";
  situacao: "Ativo" | "Inativo";
  categoria: "Pneus" | "Peças" | "Insumos" | "Serviços" | "Outros";
  celular: string;
  whatsapp?: string;
  email?: string;
  observacoes?: string;
  nomeCompleto?: string;
  cpf?: string;
  dataNascimento?: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj?: string;
};

type SupplierContext = {
  companyId: string;
  unitId: string;
  userId: string;
};

function mapStatus(status: "Ativo" | "Inativo"): "ATIVO" | "INATIVO" {
  return status === "Ativo" ? "ATIVO" : "INATIVO";
}

function mapType(type: "pf" | "pj"): "PF" | "PJ" {
  return type === "pf" ? "PF" : "PJ";
}

function mapCategory(category: SupplierPayload["categoria"]): "PNEUS" | "PECAS" | "INSUMOS" | "SERVICOS" | "OUTROS" {
  switch (category) {
    case "Pneus":
      return "PNEUS";
    case "Peças":
      return "PECAS";
    case "Insumos":
      return "INSUMOS";
    case "Serviços":
      return "SERVICOS";
    case "Outros":
    default:
      return "OUTROS";
  }
}

function buildSupplierData(payload: SupplierPayload) {
  return {
    type: mapType(payload.tipo),
    status: mapStatus(payload.situacao),
    category: mapCategory(payload.categoria),
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

export const supplierService = {
  async list(context: Pick<SupplierContext, "companyId">) {
    const suppliers = await prisma.supplier.findMany({
      where: {
        companyId: context.companyId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      suppliers: suppliers.map(mapSupplierToAppSupplier),
    };
  },

  async getById(id: string, context: Pick<SupplierContext, "companyId">) {
    const supplier = await prisma.supplier.findFirst({
      where: {
        id,
        companyId: context.companyId,
      },
    });

    if (!supplier) {
      throw new ServiceError("Fornecedor não encontrado.", 404);
    }

    return {
      supplier: mapSupplierToAppSupplier(supplier),
    };
  },

  async create(payload: SupplierPayload, context: SupplierContext) {
    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    const supplier = await db.supplier.create({
      data: {
        companyId: context.companyId,
        ...buildSupplierData(payload),
      },
    });

    return {
      supplier: mapSupplierToAppSupplier(supplier),
    };
  },

  async update(id: string, payload: SupplierPayload, context: SupplierContext) {
    const existing = await prisma.supplier.findFirst({
      where: {
        id,
        companyId: context.companyId,
      },
    });

    if (!existing) {
      throw new ServiceError("Fornecedor não encontrado.", 404);
    }

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    const supplier = await db.supplier.update({
      where: {
        id,
      },
      data: buildSupplierData(payload),
    });

    return {
      supplier: mapSupplierToAppSupplier(supplier),
    };
  },
};
