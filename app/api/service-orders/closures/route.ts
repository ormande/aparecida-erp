import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { assertUnitAccess, getRequiredSessionContext } from "@/lib/auth";
import { closureService } from "@/services/closure.service";
import { ServiceError } from "@/services/service-error";

const closureSchema = z.object({
  customerId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  sourceOrderIds: z.array(z.string().min(1)).default([]),
  sourceSelections: z
    .array(
      z.object({
        orderId: z.string().min(1),
        receivableId: z.string().min(1).optional().nullable(),
        plannedInstallmentIndex: z.coerce.number().int().min(0).max(11).optional().nullable(),
      }),
    )
    .optional(),
  dueDate: z.string().optional().nullable(),
  paymentTerm: z.enum(["A_VISTA", "A_PRAZO"]).default("A_PRAZO"),
  paymentMethod: z.string().max(100).default("Fechamento mensal"),
  unitId: z.string().nullable().optional(),
  installments: z
    .array(
      z.object({
        dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        amount: z.coerce.number().positive(),
      }),
    )
    .min(2)
    .max(12)
    .optional(),
}).refine((payload) => payload.sourceOrderIds.length > 0 || (payload.sourceSelections?.length ?? 0) > 0, {
  message: "Selecione ao menos uma OS/parcela para unificação.",
  path: ["sourceSelections"],
});

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ error: error.message, message: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(request: Request) {
  const auth = await getRequiredSessionContext({
    allowedRoles: ["PROPRIETARIO", "GESTOR"],
  });
  if (!auth.ok) {
    return auth.response;
  }

  let payload: z.infer<typeof closureSchema>;
  try {
    payload = closureSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.unitId) {
    const denied = assertUnitAccess(auth.context.units, payload.unitId);
    if (denied) return denied;
  }

  try {
    const result = await closureService.create(payload, {
      companyId: auth.context.companyId,
      unitId: payload.unitId ?? null,
      userId: auth.context.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
