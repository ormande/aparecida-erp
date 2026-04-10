import { mapVehicleToAppVehicle } from "@/lib/db-mappers";
import { getAuditPrisma } from "@/lib/prisma-audit";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/services/service-error";

type VehiclePayload = {
  plate: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  notes?: string;
  clientId: string;
};

type VehicleContext = {
  companyId: string;
  unitId?: string;
  userId: string;
};

async function ensureCustomerExists(companyId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
    select: { id: true },
  });

  if (!customer) {
    throw new ServiceError("Cliente não encontrado.", 404);
  }
}

export const vehicleService = {
  async list(filters: { customerId?: string }, context: Pick<VehicleContext, "companyId">) {
    if (filters.customerId) {
      await ensureCustomerExists(context.companyId, filters.customerId);
    }

    const vehicles = await prisma.vehicle.findMany({
      where: {
        companyId: context.companyId,
        customerId: filters.customerId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        plate: true,
        brand: true,
        model: true,
        year: true,
        color: true,
        notes: true,
        customerId: true,
      },
    });

    return {
      vehicles: vehicles.map(mapVehicleToAppVehicle),
    };
  },

  async create(payload: VehiclePayload, context: VehicleContext) {
    await ensureCustomerExists(context.companyId, payload.clientId);

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    const vehicle = await db.vehicle.create({
      data: {
        companyId: context.companyId,
        customerId: payload.clientId,
        plate: payload.plate,
        brand: payload.brand,
        model: payload.model,
        year: payload.year,
        color: payload.color || null,
        notes: payload.notes || null,
      },
      select: {
        id: true,
        plate: true,
        brand: true,
        model: true,
        year: true,
        color: true,
        notes: true,
        customerId: true,
      },
    });

    return {
      vehicle: mapVehicleToAppVehicle(vehicle),
    };
  },
};
