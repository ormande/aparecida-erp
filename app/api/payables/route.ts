import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { assertUnitAccess, getRequiredSessionContext } from "@/lib/auth";
import { payableService } from "@/services/payable.service";
import { ServiceError } from "@/services/service-error";

const payableSchema = z.object({
  description: z.string().min(2).max(500),
  category: z.enum(["Aluguel", "Fornecedores", "Água/Luz", "Funcionários", "Outros"]),
  supplierId: z.string().optional().nullable(),
  amount: z.coerce.number().min(0.01),
  dueDate: z.string().min(1),
  installments: z.coerce.number().int().min(1).max(24).default(1),
  unitId: z.string().nullable().optional(),
});

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ error: error.message, message: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request) {
  const auth = await getRequiredSessionContext({
    allowedRoles: ["PROPRIETARIO", "GESTOR"],
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);

  const unitId = searchParams.get("unitId") ?? undefined;
  if (unitId) {
    const denied = assertUnitAccess(auth.context.units, unitId);
    if (denied) return denied;
  }

  try {
    const result = await payableService.list(
      {
        status: searchParams.get("status"),
        period: searchParams.get("period"),
        unitId,
      },
      {
        companyId: auth.context.companyId,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: Request) {
  const auth = await getRequiredSessionContext({
    allowedRoles: ["PROPRIETARIO", "GESTOR"],
  });
  if (!auth.ok) {
    return auth.response;
  }

  let payload: z.infer<typeof payableSchema>;
  try {
    payload = payableSchema.parse(await request.json());
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
    const result = await payableService.create(payload, {
      companyId: auth.context.companyId,
      unitId: payload.unitId ?? null,
      userId: auth.context.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
