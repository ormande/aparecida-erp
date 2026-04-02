import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { ServiceError } from "@/services/service-error";
import { vehicleService } from "@/services/vehicle.service";

const vehicleSchema = z.object({
  plate: z.string().min(7).max(10),
  brand: z.string().min(1).max(60),
  model: z.string().min(1).max(60),
  year: z.coerce.number().int(),
  color: z.string().max(60).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
  clientId: z.string().min(1),
});

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ error: error.message, message: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: Request) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);

  try {
    const result = await vehicleService.list(
      {
        customerId: searchParams.get("customerId") ?? undefined,
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
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  let payload: z.infer<typeof vehicleSchema>;
  try {
    payload = vehicleSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await vehicleService.create(payload, {
      companyId: auth.context.companyId,
      unitId: auth.context.activeUnitId,
      userId: auth.context.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
