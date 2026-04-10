import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { assertUnitAccess, getRequiredSessionContext } from "@/lib/auth";
import { closureService } from "@/services/closure.service";
import { ServiceError } from "@/services/service-error";

const closureSchema = z.object({
  customerId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  dueDate: z.string().optional().nullable(),
  paymentTerm: z.enum(["A_VISTA", "A_PRAZO"]).default("A_PRAZO"),
  paymentMethod: z.string().max(100).default("Fechamento mensal"),
  unitId: z.string().nullable().optional(),
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
