import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { mapPayableToAppPayable } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

const payableUpdateSchema = z.object({
  mode: z.enum(["edit", "settle", "reopen"]),
  description: z.string().optional(),
  category: z.enum(["Aluguel", "Fornecedores", "Água/Luz", "Funcionários", "Outros"]).optional(),
  supplierId: z.string().nullable().optional(),
  amount: z.coerce.number().optional(),
  dueDate: z.string().optional(),
  unitId: z.string().nullable().optional(),
});

function mapCategory(category?: "Aluguel" | "Fornecedores" | "Água/Luz" | "Funcionários" | "Outros") {
  switch (category) {
    case "Aluguel":
      return "ALUGUEL";
    case "Fornecedores":
      return "FORNECEDORES";
    case "Água/Luz":
      return "AGUA_LUZ";
    case "Funcionários":
      return "FUNCIONARIOS";
    case "Outros":
      return "OUTROS";
    default:
      return undefined;
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = payableUpdateSchema.parse(await request.json());
  const existing = await prisma.accountPayable.findFirst({
    where: {
      id: params.id,
      companyId: session.user.companyId,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Conta a pagar não encontrada." }, { status: 404 });
  }

  const data: Prisma.AccountPayableUncheckedUpdateInput =
    payload.mode === "settle"
      ? { status: "PAGO", paidAt: new Date() }
      : payload.mode === "reopen"
        ? { status: "PENDENTE", paidAt: null }
        : {
            description: payload.description,
            category: mapCategory(payload.category),
            supplierId: payload.supplierId === undefined ? undefined : payload.supplierId,
            amount: payload.amount,
            dueDate: payload.dueDate ? new Date(`${payload.dueDate}T00:00:00`) : undefined,
            unitId: payload.unitId === undefined ? undefined : payload.unitId,
          };

  const updated = await prisma.accountPayable.update({
    where: {
      id: existing.id,
    },
    data,
    include: {
      supplier: {
        select: {
          type: true,
          fullName: true,
          tradeName: true,
        },
      },
      unit: {
        select: {
          name: true,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId,
      unitId: updated.unitId,
      userId: session.user.id,
      entityType: "payable",
      entityId: updated.id,
      action: payload.mode === "edit" ? "UPDATE" : "STATUS_CHANGE",
      beforeData: {
        id: existing.id,
        status: existing.status,
        amount: Number(existing.amount),
        dueDate: existing.dueDate.toISOString(),
        supplierId: existing.supplierId,
        category: existing.category,
      },
      afterData: {
        id: updated.id,
        status: updated.status,
        amount: Number(updated.amount),
        dueDate: updated.dueDate.toISOString(),
        supplierId: updated.supplierId,
        category: updated.category,
        changeSource: payload.mode,
        sourceModule: "financeiro_pagar",
      },
    },
  });

  return NextResponse.json({
    payable: {
      ...mapPayableToAppPayable(updated),
      supplierName: updated.supplier
        ? updated.supplier.type === "PF"
          ? updated.supplier.fullName ?? "-"
          : updated.supplier.tradeName ?? "-"
        : "-",
      unitName: updated.unit?.name ?? "Geral",
    },
  });
}
