import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const setupSchema = z.object({
  companyName: z.string().min(2),
  unitName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  password: z.string().min(6),
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

export async function POST(request: Request) {
  const existingUsers = await prisma.user.count();

  if (existingUsers > 0) {
    return NextResponse.json(
      {
        message: "O primeiro acesso já foi configurado.",
      },
      { status: 409 },
    );
  }

  const payload = setupSchema.parse(await request.json());
  const passwordHash = await hash(payload.password, 10);

  const companySlugBase = slugify(payload.companyName) || "empresa";
  const unitSlugBase = slugify(payload.unitName) || "unidade";

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: payload.companyName,
        slug: companySlugBase,
      },
    });

    const unit = await tx.unit.create({
      data: {
        companyId: company.id,
        name: payload.unitName,
        slug: unitSlugBase,
      },
    });

    const user = await tx.user.create({
      data: {
        companyId: company.id,
        name: payload.ownerName,
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone || null,
        passwordHash,
        accessLevel: "PROPRIETARIO",
        status: "ATIVO",
        units: {
          create: {
            unitId: unit.id,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        companyId: company.id,
        unitId: unit.id,
        userId: user.id,
        entityType: "system_setup",
        entityId: user.id,
        action: "CREATE",
        afterData: {
          companyName: company.name,
          unitName: unit.name,
          ownerEmail: user.email,
        },
      },
    });

    return {
      company,
      unit,
      user,
    };
  });

  return NextResponse.json({
    ok: true,
    unitId: result.unit.id,
  });
}
