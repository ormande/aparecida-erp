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

async function requireSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return null;
  }

  return session;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Não autenticado." }, { status: 401 });

  const service = await prisma.serviceCatalog.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    select: { id: true, name: true, description: true, basePrice: true, isActive: true },
  });

  if (!service) return NextResponse.json({ message: "Serviço não encontrado." }, { status: 404 });
  return NextResponse.json({ service: mapServiceToAppService(service) });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ message: "Não autenticado." }, { status: 401 });

  const payload = serviceSchema.parse(await request.json());

  const existing = await prisma.serviceCatalog.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    select: { id: true, name: true, description: true, basePrice: true, isActive: true },
  });

  if (!existing) return NextResponse.json({ message: "Serviço não encontrado." }, { status: 404 });

  const service = await prisma.serviceCatalog.update({
    where: { id: params.id },
    data: {
      name: payload.name,
      description: payload.description || null,
      basePrice: payload.basePrice,
      isActive: payload.isActive,
      updatedByUserId: session.user.id,
    },
    select: { id: true, name: true, description: true, basePrice: true, isActive: true },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId,
      userId: session.user.id,
      entityType: "service_catalog",
      entityId: service.id,
      action: "UPDATE",
      beforeData: existing,
      afterData: {
        ...service,
        basePrice: Number(service.basePrice),
      },
    },
  });

  return NextResponse.json({ service: mapServiceToAppService(service) });
}
