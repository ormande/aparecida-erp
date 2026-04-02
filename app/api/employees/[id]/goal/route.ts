import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const goalSchema = z.object({
  monthlyGoal: z.union([z.number().min(0).max(99_999_999.99), z.null()]),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext({
    allowedRoles: ["PROPRIETARIO"],
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: z.infer<typeof goalSchema>;
  try {
    body = goalSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { monthlyGoal } = body;

  try {
    const updated = await prisma.user.update({
      where: {
        id: params.id,
        companyId: auth.context.companyId,
      },
      data: {
        monthlyGoal: monthlyGoal === null ? null : new Prisma.Decimal(monthlyGoal),
      },
      select: {
        id: true,
        monthlyGoal: true,
      },
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        monthlyGoal: updated.monthlyGoal === null ? null : Number(updated.monthlyGoal),
      },
    });
  } catch {
    return NextResponse.json({ message: "Funcionário não encontrado." }, { status: 404 });
  }
}
