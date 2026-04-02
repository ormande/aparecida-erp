import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions, checkRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createUnitSchema = z.object({
  name: z.string().min(2).max(100),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const where: {
    companyId: string;
    isActive: boolean;
    id?: { in: string[] };
  } = {
    companyId: session.user.companyId,
    isActive: true,
  };

  if (session.user.accessLevel !== "PROPRIETARIO") {
    const unitIds = (session.user.units ?? []).map((u) => u.id);
    if (unitIds.length === 0) {
      return NextResponse.json({ units: [] });
    }
    where.id = { in: unitIds };
  }

  const units = await prisma.unit.findMany({
    where,
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
    },
  });

  return NextResponse.json({ units });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  if (!checkRole(session, ["PROPRIETARIO"])) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
  }

  const payload = createUnitSchema.parse(await request.json());
  const slug = slugify(payload.name) || "unidade";

  const unit = await prisma.unit.create({
    data: {
      companyId: session.user.companyId,
      name: payload.name,
      slug: `${slug}-${Date.now().toString().slice(-6)}`,
    },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
    },
  });

  await prisma.userUnit.create({
    data: {
      userId: session.user.id,
      unitId: unit.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId,
      unitId: unit.id,
      userId: session.user.id,
      entityType: "unit",
      entityId: unit.id,
      action: "CREATE",
      afterData: {
        name: unit.name,
      },
    },
  });

  return NextResponse.json({ unit }, { status: 201 });
}
