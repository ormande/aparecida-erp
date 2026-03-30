import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const unitSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = unitSchema.parse(await request.json());

  const existing = await prisma.unit.findFirst({
    where: {
      id: params.id,
      companyId: session.user.companyId,
    },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Unidade não encontrada." }, { status: 404 });
  }

  const unit = await prisma.unit.update({
    where: {
      id: existing.id,
    },
    data: {
      name: payload.name,
      address: payload.address || null,
      phone: payload.phone || null,
    },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId,
      unitId: unit.id,
      userId: session.user.id,
      entityType: "unit",
      entityId: unit.id,
      action: "UPDATE",
      beforeData: existing,
      afterData: unit,
    },
  });

  return NextResponse.json({ unit });
}
