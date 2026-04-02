import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { ServiceError } from "@/services/service-error";
import { serviceOrderService } from "@/services/service-order.service";

const patchStatusSchema = z.object({
  status: z.enum(["Aberta", "Em andamento", "Aguardando peça", "Concluída", "Cancelada"]),
});

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    const bodyKey = error.message.includes("not found") ? "error" : "message";
    return NextResponse.json({ [bodyKey]: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  let body: z.infer<typeof patchStatusSchema>;
  try {
    body = patchStatusSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await serviceOrderService.updateStatus(params.id, body.status, {
      companyId: auth.context.companyId,
      unitId: auth.context.activeUnitId,
      userId: auth.context.userId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
