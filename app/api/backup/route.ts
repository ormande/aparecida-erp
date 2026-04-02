import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getRequiredSessionContext } from "@/lib/auth";

function serializeBackupValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Prisma.Decimal) {
    return Number(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((v) => serializeBackupValue(v));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializeBackupValue(v)]));
  }

  return value;
}

export async function GET() {
  const auth = await getRequiredSessionContext({ allowedRoles: ["PROPRIETARIO"] });
  if (!auth.ok) return auth.response;

  const company = await prisma.company.findUnique({
    where: { id: auth.context.companyId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!company) {
    return NextResponse.json({ message: "Empresa não encontrada." }, { status: 404 });
  }

  const [
    customers,
    suppliers,
    vehicles,
    serviceOrders,
    receivables,
    payables,
    services,
  ] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: auth.context.companyId },
      select: {
        id: true,
        type: true,
        status: true,
        fullName: true,
        cpf: true,
        birthDate: true,
        tradeName: true,
        legalName: true,
        cnpj: true,
        phone: true,
        whatsapp: true,
        email: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.supplier.findMany({
      where: { companyId: auth.context.companyId },
      select: {
        id: true,
        type: true,
        status: true,
        category: true,
        fullName: true,
        cpf: true,
        birthDate: true,
        tradeName: true,
        legalName: true,
        cnpj: true,
        phone: true,
        whatsapp: true,
        email: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.vehicle.findMany({
      where: { companyId: auth.context.companyId },
      select: {
        id: true,
        customerId: true,
        plate: true,
        model: true,
        brand: true,
        year: true,
        color: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.serviceOrder.findMany({
      where: { companyId: auth.context.companyId },
      select: {
        id: true,
        unitId: true,
        customerId: true,
        customerNameSnapshot: true,
        vehicleId: true,
        number: true,
        status: true,
        openedAt: true,
        closedAt: true,
        mileage: true,
        dueDate: true,
        paymentTerm: true,
        paymentMethod: true,
        notes: true,
        isStandalone: true,
        totalAmount: true,
        createdByUserId: true,
        updatedByUserId: true,
        createdAt: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            serviceOrderId: true,
            serviceId: true,
            description: true,
            quantity: true,
            laborPrice: true,
            lineTotal: true,
            previousOrderStatus: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.accountReceivable.findMany({
      where: { companyId: auth.context.companyId },
      select: {
        id: true,
        unitId: true,
        customerId: true,
        serviceOrderId: true,
        originType: true,
        description: true,
        amount: true,
        dueDate: true,
        paidAt: true,
        status: true,
        installmentGroupId: true,
        installmentNumber: true,
        installmentCount: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.accountPayable.findMany({
      where: { companyId: auth.context.companyId },
      select: {
        id: true,
        unitId: true,
        supplierId: true,
        description: true,
        category: true,
        amount: true,
        dueDate: true,
        paidAt: true,
        status: true,
        installmentGroupId: true,
        installmentNumber: true,
        installmentCount: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.serviceCatalog.findMany({
      where: { companyId: auth.context.companyId },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        isActive: true,
        createdByUserId: true,
        updatedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const exportedAt = new Date().toISOString();
  const filenameDate = exportedAt.slice(0, 10);
  const payload = {
    exportedAt,
    version: "1.0",
    company,
    data: {
      customers,
      suppliers,
      vehicles,
      serviceOrders,
      receivables,
      payables,
      services,
    },
  };

  const body = serializeBackupValue(payload);

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="backup-${filenameDate}.json"`,
    },
  });
}

