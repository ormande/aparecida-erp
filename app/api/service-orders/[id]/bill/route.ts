import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { checkRole, getRequiredSessionContext } from "@/lib/auth";
import { serviceOrderService } from "@/services/service-order.service";
import { ServiceError } from "@/services/service-error";

const billBodySchema = z.object({
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentMethod: z.string().max(100).optional(),
  paymentTerm: z.enum(["A_VISTA", "A_PRAZO"]).optional(),
  installments: z
    .array(
      z.object({
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        amount: z.coerce.number().positive(),
      }),
    )
    .min(1)
    .max(12)
    .optional(),
});

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    const bodyKey = error.message.includes("not found") ? "error" : "message";
    return NextResponse.json({ [bodyKey]: error.message, details: error.details }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("[POST /api/service-orders/.../bill] Prisma", error.code, error.meta, error.message);
    const meta = error.meta as Record<string, unknown> | undefined;
    const target = meta?.target;
    let hint = "";
    if (error.code === "P2002") {
      hint =
        " Violação de unicidade (provavelmente já existe recebível para esta OS). Atualize a página; se persistir, verifique duplicidade no banco.";
    } else if (error.code === "P2003") {
      hint = " Referência inválida (FK) — registro relacionado ausente ou inconsistente.";
    } else if (error.code === "P2028") {
      hint =
        " Transação expirou no banco (operação demorou demais). Tente de novo; se for FEC ou muitas parcelas, o servidor já usa timeout maior.";
    }
    return NextResponse.json(
      {
        message: `Erro ao gravar faturamento (${error.code}).${hint} Detalhe: ${error.message}`,
        prismaCode: error.code,
        details: error.meta,
        target,
      },
      { status: 400 },
    );
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error("[POST /api/service-orders/.../bill] Validation", error.message);
    return NextResponse.json({ message: "Dados inválidos para o banco.", details: error.message }, { status: 400 });
  }
  console.error("[POST /api/service-orders/.../bill] Unexpected", error);
  return NextResponse.json(
    {
      error: "Internal server error",
      ...(process.env.NODE_ENV === "development" && error instanceof Error
        ? { details: error.message, stack: error.stack }
        : {}),
    },
    { status: 500 },
  );
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  let billBody: z.infer<typeof billBodySchema> = {};
  const text = await request.text();
  if (text.trim()) {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = billBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }
    billBody = parsed.data;
  }

  try {
    const result = await serviceOrderService.update(
      params.id,
      {
        mode: "bill",
        ...(billBody.dueDate ? { dueDate: billBody.dueDate } : {}),
        ...(billBody.paymentMethod !== undefined ? { paymentMethod: billBody.paymentMethod } : {}),
        ...(billBody.paymentTerm ? { paymentTerm: billBody.paymentTerm } : {}),
        ...(billBody.installments ? { installments: billBody.installments } : {}),
      },
      {
        companyId: auth.context.companyId,
        userId: auth.context.userId,
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  if (!checkRole(auth.context.session, ["PROPRIETARIO", "GESTOR"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await serviceOrderService.update(
      params.id,
      { mode: "unbill" },
      {
        companyId: auth.context.companyId,
        userId: auth.context.userId,
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
