import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions, checkRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const companySchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().max(300).optional().default(""),
  phone: z.string().max(20).optional().default(""),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  if (!checkRole(session, ["PROPRIETARIO"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await prisma.company.findUnique({
    where: {
      id: session.user.companyId,
    },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      slug: true,
    },
  });

  if (!company) {
    return NextResponse.json({ message: "Empresa não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ company });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  if (!checkRole(session, ["PROPRIETARIO"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = companySchema.parse(await request.json());

  const existing = await prisma.company.findUnique({
    where: {
      id: session.user.companyId,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Empresa não encontrada." }, { status: 404 });
  }

  const company = await prisma.company.update({
    where: {
      id: session.user.companyId,
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
      slug: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId,
      userId: session.user.id,
      entityType: "company",
      entityId: company.id,
      action: "UPDATE",
      beforeData: existing,
      afterData: company,
    },
  });

  return NextResponse.json({ company });
}
