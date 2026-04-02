import { mapServiceOrderStatus } from "@/lib/db-mappers";
import { getAuditPrisma } from "@/lib/prisma-audit";
import { prisma } from "@/lib/prisma";
import { normalizeSearch } from "@/lib/search-helpers";
import { ServiceError } from "@/services/service-error";
import { Prisma, type ServiceOrderStatus } from "@prisma/client";

type OrderServiceItemPayload = {
  serviceId?: string | null;
  description: string;
  laborPrice: number;
};

type CreateOrderPayload = {
  customerId?: string | null;
  customerNameSnapshot?: string;
  vehicleId?: string | null;
  mileage?: number | null;
  dueDate?: string | null;
  paymentTerm?: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod?: string;
  notes?: string;
  services: OrderServiceItemPayload[];
};

type UpdateOrderPayload = {
  mode: "edit" | "settle" | "reopen";
  discountAmount?: number;
  customerId?: string | null;
  customerNameSnapshot?: string;
  vehicleId?: string | null;
  mileage?: number | null;
  dueDate?: string | null;
  paymentTerm?: "A_VISTA" | "A_PRAZO" | null;
  paymentMethod?: string;
  notes?: string;
  services?: OrderServiceItemPayload[];
};

type ServiceOrderContext = {
  companyId: string;
  unitId: string;
  userId: string;
};

type ListOrdersFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  unitId?: string;
  vehicleId?: string;
  customerId?: string;
};

function buildOrderNumber(year: number, sequence: number) {
  return `OS-${year}-${String(sequence).padStart(4, "0")}`;
}

async function getNextOrderNumber(tx: Prisma.TransactionClient, companyId: string) {
  const lockKey = `${companyId}-os-number`;
  await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1::text))", lockKey);

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
      .map((order) => Number(order.number.split("-").at(-1)))
      .filter((value) => Number.isFinite(value) && value > 0),
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
  vehicleId: string | null;
  number: string;
  status: string;
  openedAt: Date;
  closedAt: Date | null;
  mileage: number | null;
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
    vehicleId: order.vehicleId,
    number: order.number,
    status: order.status,
    openedAt: order.openedAt.toISOString(),
    closedAt: order.closedAt?.toISOString() ?? null,
    mileage: order.mileage,
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

function receivableAfterDataForAudit(receivable: {
  id: string;
  companyId: string;
  unitId: string | null;
  customerId: string | null;
  serviceOrderId: string | null;
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
}): Prisma.InputJsonValue {
  return {
    id: receivable.id,
    companyId: receivable.companyId,
    unitId: receivable.unitId,
    customerId: receivable.customerId,
    serviceOrderId: receivable.serviceOrderId,
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

async function getOrder(companyId: string, unitId: string, id: string) {
  return prisma.serviceOrder.findFirst({
    where: { id, companyId, unitId },
    include: {
      customer: {
        select: {
          type: true,
          fullName: true,
          tradeName: true,
        },
      },
      vehicle: {
        select: {
          plate: true,
          brand: true,
          model: true,
        },
      },
      items: {
        select: {
          id: true,
          serviceId: true,
          description: true,
          laborPrice: true,
          lineTotal: true,
          previousOrderStatus: true,
        },
      },
      receivables: {
        select: {
          id: true,
          status: true,
          amount: true,
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
    clientId: order.customerId,
    clientName: getCustomerDisplayName(order),
    customerNameSnapshot: order.customerNameSnapshot,
    unitId: order.unitId,
    unitName: order.unit.name,
    vehicleId: order.vehicleId,
    plate: order.vehicle?.plate ?? "-",
    vehicleLabel: order.vehicle ? `${order.vehicle.plate} â€¢ ${order.vehicle.brand} ${order.vehicle.model}` : "-",
    status: mapServiceOrderStatus(order.status),
    total: Number(order.totalAmount),
    openedAt: order.openedAt.toISOString().slice(0, 10),
    dueDate: order.dueDate?.toISOString().slice(0, 10) ?? "",
    paymentTerm: order.paymentTerm,
    paymentMethod: order.paymentMethod ?? "",
    notes: order.notes ?? "",
    mileage: order.mileage ?? null,
    isStandalone: order.isStandalone,
    services: order.items.map((item) => ({
      id: item.id,
      serviceId: item.serviceId,
      description: item.description,
      laborPrice: Number(item.laborPrice),
    })),
    receivableStatus: order.receivables[0]?.status ?? null,
    receivableAmount: order.receivables[0] ? Number(order.receivables[0].amount) : 0,
  };
}

function getReferencedOrderNumbers(descriptions: string[]) {
  const matches = descriptions
    .flatMap((description) => Array.from(description.matchAll(/OS-\d{4}-\d{4}/g)).map((match) => match[0]))
    .filter(Boolean);

  return Array.from(new Set(matches));
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

async function ensureVehicleExists(vehicleId: string, companyId: string, customerId?: string | null) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, companyId },
    select: { id: true, customerId: true },
  });

  if (!vehicle) {
    throw new ServiceError("Veículo não encontrado.", 404);
  }

  if (customerId && vehicle.customerId !== customerId) {
    throw new ServiceError("Veículo não encontrado.", 404);
  }
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
      vehicleId: filters.vehicleId,
      customerId: filters.customerId,
      status: mappedStatus,
    };

    if (normalizedSearch) {
      const pattern = `%${normalizeSearch(normalizedSearch)}%`;
      const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT DISTINCT so."id"
        FROM "ServiceOrder" so
        LEFT JOIN "Customer" c ON c."id" = so."customerId"
        LEFT JOIN "Vehicle" v ON v."id" = so."vehicleId"
        LEFT JOIN "ServiceOrderItem" soi ON soi."serviceOrderId" = so."id"
        WHERE so."companyId" = ${context.companyId}
          AND (
            unaccent(LOWER(COALESCE(so."number", ''))) LIKE unaccent(LOWER(${pattern}::text))
            OR unaccent(LOWER(COALESCE(so."customerNameSnapshot", ''))) LIKE unaccent(LOWER(${pattern}::text))
            OR unaccent(LOWER(COALESCE(c."fullName", ''))) LIKE unaccent(LOWER(${pattern}::text))
            OR unaccent(LOWER(COALESCE(c."tradeName", ''))) LIKE unaccent(LOWER(${pattern}::text))
            OR unaccent(LOWER(COALESCE(v."plate", ''))) LIKE unaccent(LOWER(${pattern}::text))
            OR unaccent(LOWER(COALESCE(soi."description", ''))) LIKE unaccent(LOWER(${pattern}::text))
          )
      `);
      const ids = rows.map((row) => row.id);
      where.id = { in: ids.length > 0 ? ids : [] };
    }

    const [total, orders] = await prisma.$transaction([
      prisma.serviceOrder.count({ where }),
      prisma.serviceOrder.findMany({
        where,
        orderBy: { openedAt: "desc" },
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              type: true,
              fullName: true,
              tradeName: true,
            },
          },
          vehicle: {
            select: { plate: true },
          },
          unit: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            select: { description: true },
          },
          receivables: {
            select: { status: true },
          },
        },
      }),
    ]);

    return {
      data: orders.map((order) => ({
        id: order.id,
        number: order.number,
        clientId: order.customerId,
        vehicleId: order.vehicleId,
        clientName: getCustomerDisplayName(order),
        plate: order.vehicle?.plate ?? "-",
        unitId: order.unitId,
        unitName: order.unit.name,
        servicesLabel: order.items.map((service) => service.description).join(", "),
        status: mapServiceOrderStatus(order.status),
        total: Number(order.totalAmount),
        openedAt: order.openedAt.toISOString().slice(0, 10),
        dueDate: order.dueDate?.toISOString().slice(0, 10) ?? null,
        paymentTerm: order.paymentTerm,
        paymentMethod: order.paymentMethod ?? "",
        isStandalone: order.isStandalone,
        receivableStatus: order.receivables[0]?.status ?? null,
      })),
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

    if (payload.vehicleId) {
      await ensureVehicleExists(payload.vehicleId, context.companyId, payload.customerId);
    }

    const totalAmount = payload.services.reduce((sum, item) => sum + Number(item.laborPrice), 0);
    const paymentTerm = payload.paymentTerm ?? "A_VISTA";
    const dueDate =
      paymentTerm === "A_PRAZO" && payload.dueDate ? new Date(`${payload.dueDate}T00:00:00`) : new Date();

    const { order, receivable } = await prisma.$transaction(async (tx) => {
      const number = await getNextOrderNumber(tx, context.companyId);

      const orderRow = await tx.serviceOrder.create({
        data: {
          companyId: context.companyId,
          unitId: context.unitId,
          customerId: payload.customerId || null,
          customerNameSnapshot: payload.customerId ? null : payload.customerNameSnapshot || "Cliente avulso",
          vehicleId: payload.vehicleId || null,
          number,
          mileage: payload.mileage ?? null,
          dueDate,
          paymentTerm,
          paymentMethod: payload.paymentMethod || null,
          notes: payload.notes || null,
          isStandalone: !payload.customerId,
          totalAmount,
          createdByUserId: context.userId,
          updatedByUserId: context.userId,
          items: {
            create: payload.services.map((service) => ({
              serviceId: service.serviceId || null,
              description: service.description,
              laborPrice: service.laborPrice,
              lineTotal: service.laborPrice,
            })),
          },
        },
      });

      const receivableRow = await tx.accountReceivable.create({
        data: {
          companyId: context.companyId,
          unitId: context.unitId,
          customerId: payload.customerId || null,
          serviceOrderId: orderRow.id,
          originType: "SERVICE_ORDER",
          description: orderRow.number,
          amount: totalAmount,
          dueDate,
          status: "PENDENTE",
          installmentGroupId: null,
          installmentNumber: null,
          installmentCount: null,
        },
      });

      return { order: orderRow, receivable: receivableRow };
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

    await prisma.auditLog.create({
      data: {
        companyId: context.companyId,
        unitId: receivable.unitId ?? context.unitId ?? null,
        userId: context.userId,
        entityType: "receivable",
        entityId: receivable.id,
        action: "CREATE",
        afterData: receivableAfterDataForAudit(receivable),
      },
    });

    return { orderId: order.id, number: order.number };
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

      if (payload.vehicleId) {
        await ensureVehicleExists(payload.vehicleId, context.companyId, payload.customerId);
      }

      const services = payload.services ?? [];
      const totalAmount = services.reduce((sum, item) => sum + Number(item.laborPrice), 0);
      const paymentTerm = payload.paymentTerm ?? existing.paymentTerm ?? "A_VISTA";
      const dueDate =
        paymentTerm === "A_PRAZO" && payload.dueDate ? new Date(`${payload.dueDate}T00:00:00`) : new Date();

      const updated = await db.$transaction(async (tx) => {
        await tx.serviceOrderItem.deleteMany({
          where: { serviceOrderId: existing.id },
        });

        const order = await tx.serviceOrder.update({
          where: { id: existing.id },
          data: {
            customerId: payload.customerId || null,
            unitId: context.unitId,
            customerNameSnapshot: payload.customerId ? null : payload.customerNameSnapshot || "Cliente avulso",
            vehicleId: payload.vehicleId || null,
            mileage: payload.mileage ?? null,
            dueDate,
            paymentTerm,
            paymentMethod: payload.paymentMethod || null,
            notes: payload.notes || null,
            isStandalone: !payload.customerId,
            totalAmount,
            updatedByUserId: context.userId,
            items: {
              create: services.map((service) => ({
                serviceId: service.serviceId || null,
                description: service.description,
                laborPrice: service.laborPrice,
                lineTotal: service.laborPrice,
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
            vehicle: {
              select: {
                plate: true,
                brand: true,
                model: true,
              },
            },
            items: {
              select: {
                id: true,
                serviceId: true,
                description: true,
                laborPrice: true,
                lineTotal: true,
                previousOrderStatus: true,
              },
            },
            receivables: {
              select: {
                id: true,
                status: true,
                amount: true,
              },
            },
          },
        });

        await tx.accountReceivable.updateMany({
          where: {
            serviceOrderId: existing.id,
            originType: "SERVICE_ORDER",
          },
          data: {
            customerId: payload.customerId || null,
            unitId: context.unitId,
            amount: totalAmount,
            dueDate,
          },
        });

        return order;
      });

      return { order: mapOrder(updated) };
    }

    const receivable = existing.receivables[0];
    if (!receivable) {
      throw new ServiceError("Recebível vinculado não encontrado.", 404);
    }

    const targetStatus = payload.mode === "settle" ? "PAGO" : "PENDENTE";
    const orderStatus =
      payload.mode === "settle" ? "CONCLUIDA" : existing.status === "CONCLUIDA" ? "ABERTA" : existing.status;
    const closureOutstandingAmount = existing.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const appliedDiscount =
      existing.number.startsWith("FEC-") && payload.mode === "settle"
        ? Math.min(payload.discountAmount ?? 0, closureOutstandingAmount)
        : 0;
    const closureSettledAmount = Math.max(closureOutstandingAmount - appliedDiscount, 0);

    const updated = await db.$transaction(async (tx) => {
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

      if (existing.number.startsWith("FEC-")) {
        const sourceNumbers = getReferencedOrderNumbers(existing.items.map((item) => item.description));
        const reopenableSourceNumbers = getReferencedOrderNumbers(
          existing.items
            .filter((item) => !item.description.includes("ja pago") && !item.description.includes("jÃ¡ pago"))
            .map((item) => item.description),
        );
        const effectiveSourceNumbers = payload.mode === "reopen" ? reopenableSourceNumbers : sourceNumbers;

        if (effectiveSourceNumbers.length) {
          const sourceOrders = await tx.serviceOrder.findMany({
            where: {
              companyId: context.companyId,
              unitId: context.unitId,
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
                status: targetStatus,
                paidAt: payload.mode === "settle" ? new Date() : null,
              },
            });
          }

          if (sourceOrderIds.length) {
            if (payload.mode === "reopen") {
              const previousStatusByNumber = new Map<string, ServiceOrderStatus>();
              for (const item of existing.items) {
                for (const num of getReferencedOrderNumbers([item.description])) {
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
                  status: orderStatus,
                  closedAt: payload.mode === "settle" ? new Date() : null,
                  updatedByUserId: context.userId,
                },
              });
            }
          }
        }
      }

      const order = await tx.serviceOrder.update({
        where: { id: existing.id },
        data: {
          status: orderStatus,
          updatedByUserId: context.userId,
          closedAt: payload.mode === "settle" ? new Date() : null,
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
          vehicle: {
            select: {
              plate: true,
              brand: true,
              model: true,
            },
          },
          items: {
            select: {
              id: true,
              serviceId: true,
              description: true,
              laborPrice: true,
              lineTotal: true,
              previousOrderStatus: true,
            },
          },
          receivables: {
            select: {
              id: true,
              status: true,
              amount: true,
            },
          },
        },
      });

      return order;
    });

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


