import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { ServiceError } from "@/services/service-error";
import { serviceOrderService } from "@/services/service-order.service";

const orderSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerNameSnapshot: z.string().max(100).optional().default(""),
  vehicleId: z.string().optional().nullable(),
  mileage: z.coerce.number().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  paymentTerm: z.enum(["A_VISTA", "A_PRAZO"]).optional().nullable(),
  paymentMethod: z.string().max(100).optional().default(""),
  notes: z.string().max(2000).optional().default(""),
  services: z
    .array(
      z.object({
        serviceId: z.string().optional().nullable(),
        description: z.string().min(1).max(500),
        laborPrice: z.coerce.number().min(0),
        executedByUserId: z.string().optional().nullable(),
      }),
    )
    .min(1),
});

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");

  try {
    const result = await serviceOrderService.list(
      {
        page,
        limit,
        search: searchParams.get("search") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        unitId: searchParams.get("unitId") ?? undefined,
        vehicleId: searchParams.get("vehicleId") ?? undefined,
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

  let payload: z.infer<typeof orderSchema>;
  try {
    payload = orderSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await serviceOrderService.create(payload, {
      companyId: auth.context.companyId,
      unitId: auth.context.activeUnitId,
      userId: auth.context.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      error.meta?.modelName === "ServiceOrder"
    ) {
      return NextResponse.json(
        { message: "Conflito ao gerar número da OS. Tente novamente." },
        { status: 409 },
      );
    }

    return handleServiceError(error);
  }
}
