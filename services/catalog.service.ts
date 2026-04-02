import { mapServiceToAppService } from "@/lib/db-mappers";
import { getAuditPrisma } from "@/lib/prisma-audit";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/services/service-error";

type CatalogPayload = {
  name: string;
  description?: string;
  basePrice: number;
  isActive: boolean;
};

type CatalogContext = {
  companyId: string;
  unitId: string;
  userId: string;
};

export const catalogService = {
  async list(context: Pick<CatalogContext, "companyId">) {
    const services = await prisma.serviceCatalog.findMany({
      where: {
        companyId: context.companyId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        isActive: true,
      },
    });

    return {
      services: services.map(mapServiceToAppService),
    };
  },

  async getById(id: string, context: Pick<CatalogContext, "companyId">) {
    const service = await prisma.serviceCatalog.findFirst({
      where: { id, companyId: context.companyId },
      select: { id: true, name: true, description: true, basePrice: true, isActive: true },
    });

    if (!service) {
      throw new ServiceError("Serviço não encontrado.", 404);
    }

    return { service: mapServiceToAppService(service) };
  },

  async create(payload: CatalogPayload, context: CatalogContext) {
    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    const service = await db.serviceCatalog.create({
      data: {
        companyId: context.companyId,
        name: payload.name,
        description: payload.description || null,
        basePrice: payload.basePrice,
        isActive: payload.isActive,
        createdByUserId: context.userId,
        updatedByUserId: context.userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        isActive: true,
      },
    });

    return { service: mapServiceToAppService(service) };
  },

  async update(id: string, payload: CatalogPayload, context: CatalogContext) {
    const existing = await prisma.serviceCatalog.findFirst({
      where: { id, companyId: context.companyId },
      select: { id: true, name: true, description: true, basePrice: true, isActive: true },
    });

    if (!existing) {
      throw new ServiceError("Serviço não encontrado.", 404);
    }

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    const service = await db.serviceCatalog.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description || null,
        basePrice: payload.basePrice,
        isActive: payload.isActive,
        updatedByUserId: context.userId,
      },
      select: { id: true, name: true, description: true, basePrice: true, isActive: true },
    });

    return { service: mapServiceToAppService(service) };
  },
};
