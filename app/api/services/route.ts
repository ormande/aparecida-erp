import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { mapServiceToAppService } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().default(""),
  basePrice: z.coerce.number().min(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const services = await prisma.serviceCatalog.findMany({
    where: {
      companyId: session.user.companyId,
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

  return NextResponse.json({
    services: services.map(mapServiceToAppService),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = serviceSchema.parse(await request.json());

  const service = await prisma.serviceCatalog.create({
    data: {
      companyId: session.user.companyId,
      name: payload.name,
      description: payload.description || null,
      basePrice: payload.basePrice,
      isActive: payload.isActive,
      createdByUserId: session.user.id,
      updatedByUserId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      basePrice: true,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId,
      userId: session.user.id,
      entityType: "service_catalog",
      entityId: service.id,
      action: "CREATE",
      afterData: {
        name: service.name,
        basePrice: Number(service.basePrice),
      },
    },
  });

  return NextResponse.json({ service: mapServiceToAppService(service) }, { status: 201 });
}
