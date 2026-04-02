import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { catalogService } from "@/services/catalog.service";
import { ServiceError } from "@/services/service-error";

const serviceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().default(""),
  basePrice: z.coerce.number().min(0),
  isActive: z.boolean().default(true),
});

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ error: error.message, message: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET() {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await catalogService.list({ companyId: auth.context.companyId });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function POST(request: Request) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  let payload: z.infer<typeof serviceSchema>;
  try {
    payload = serviceSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await catalogService.create(payload, {
      companyId: auth.context.companyId,
      unitId: auth.context.activeUnitId,
      userId: auth.context.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
