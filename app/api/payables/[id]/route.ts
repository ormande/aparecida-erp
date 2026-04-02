import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { payableService } from "@/services/payable.service";
import { ServiceError } from "@/services/service-error";

const payableUpdateSchema = z.object({
  mode: z.enum(["edit", "settle", "reopen"]),
  description: z.string().max(500).optional(),
  category: z.enum(["Aluguel", "Fornecedores", "Água/Luz", "Funcionários", "Outros"]).optional(),
  supplierId: z.string().nullable().optional(),
  amount: z.coerce.number().optional(),
  dueDate: z.string().optional(),
});

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ error: error.message, message: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext({
    allowedRoles: ["PROPRIETARIO", "GESTOR"],
  });
  if (!auth.ok) {
    return auth.response;
  }

  let payload: z.infer<typeof payableUpdateSchema>;
  try {
    payload = payableUpdateSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await payableService.update(params.id, payload, {
      companyId: auth.context.companyId,
      unitId: auth.context.activeUnitId,
      userId: auth.context.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
