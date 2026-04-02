import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { receivableService } from "@/services/receivable.service";
import { ServiceError } from "@/services/service-error";

const receivableSchema = z.object({
  description: z.string().min(2).max(500),
  customerId: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  dueDate: z.string().min(1),
  installments: z.coerce.number().int().min(1).max(24).default(1),
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

  try {
    const result = await receivableService.list(
      {
        status: searchParams.get("status"),
        period: searchParams.get("period"),
      },
      {
        companyId: auth.context.companyId,
        unitId: auth.context.activeUnitId,
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

  let payload: z.infer<typeof receivableSchema>;
  try {
    payload = receivableSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await receivableService.create(payload, {
      companyId: auth.context.companyId,
      unitId: auth.context.activeUnitId,
      userId: auth.context.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
