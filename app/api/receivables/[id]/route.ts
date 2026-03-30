import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { mapReceivableToAppReceivable } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

const receivableUpdateSchema = z.object({
  mode: z.enum(["edit", "settle", "reopen"]),
  description: z.string().optional(),
  customerId: z.string().optional(),
  amount: z.coerce.number().optional(),
  dueDate: z.string().optional(),
  unitId: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = receivableUpdateSchema.parse(await request.json());
  const existing = await prisma.accountReceivable.findFirst({
    where: {
      id: params.id,
      companyId: session.user.companyId,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Recebível não encontrado." }, { status: 404 });
  }

  if (payload.mode === "edit" && existing.originType === "SERVICE_ORDER") {
    return NextResponse.json(
      { message: "Recebíveis gerados por OS só podem ser baixados ou reabertos." },
      { status: 400 },
    );
  }

  const data: Prisma.AccountReceivableUncheckedUpdateInput =
    payload.mode === "settle"
      ? { status: "PAGO", paidAt: new Date() }
      : payload.mode === "reopen"
        ? { status: "PENDENTE", paidAt: null }
        : {
            description: payload.description,
            customerId: payload.customerId,
            amount: payload.amount,
            dueDate: payload.dueDate ? new Date(`${payload.dueDate}T00:00:00`) : undefined,
            unitId: payload.unitId === undefined ? undefined : payload.unitId,
          };

  const updated = await prisma.accountReceivable.update({
    where: {
      id: existing.id,
    },
    data,
    include: {
      customer: {
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
      entityType: "receivable",
      entityId: updated.id,
      action: payload.mode === "edit" ? "UPDATE" : "STATUS_CHANGE",
      beforeData: {
        id: existing.id,
        status: existing.status,
        amount: Number(existing.amount),
        dueDate: existing.dueDate.toISOString(),
        originType: existing.originType,
        serviceOrderId: existing.serviceOrderId,
      },
      afterData: {
        id: updated.id,
        status: updated.status,
        amount: Number(updated.amount),
        dueDate: updated.dueDate.toISOString(),
        originType: updated.originType,
        serviceOrderId: updated.serviceOrderId,
        changeSource: payload.mode,
        sourceModule: "financeiro_receber",
      },
    },
  });

  return NextResponse.json({
    receivable: {
      ...mapReceivableToAppReceivable(updated),
      clientName: updated.customer
        ? updated.customer.type === "PF"
          ? updated.customer.fullName ?? "-"
          : updated.customer.tradeName ?? "-"
        : "-",
      unitName: updated.unit?.name ?? "Geral",
    },
  });
}
