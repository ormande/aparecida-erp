import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { checkRole, getRequiredSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/services/service-error";
import { serviceOrderService } from "@/services/service-order.service";

const updateOrderSchema = z.object({
  mode: z.enum(["edit", "settle", "reopen"]),
  discountAmount: z.coerce.number().min(0).optional().default(0),
  partialAmount: z.coerce.number().min(0).max(999999.99).optional().default(0),
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
        commissionRate: z.coerce.number().int().min(1).max(100).optional().default(12),
      }),
    )
    .optional(),
  products: z
    .array(
      z.object({
        productId: z.string().optional().nullable(),
        description: z.string().min(1).max(500),
        unit: z.enum(["UN", "PAR", "KIT", "L", "ML", "KG", "G", "CX"]).optional().default("UN"),
        quantity: z.coerce.number().min(0.001),
        unitPrice: z.coerce.number().min(0),
      }),
    )
    .optional()
    .default([]),
});

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    const bodyKey = error.message.includes("not found") ? "error" : "message";
    return NextResponse.json({ [bodyKey]: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await serviceOrderService.getById(params.id, {
      companyId: auth.context.companyId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  let payload: z.infer<typeof updateOrderSchema>;
  try {
    payload = updateOrderSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    payload.mode === "settle" &&
    payload.partialAmount > 0
  ) {
    const order = await prisma.serviceOrder.findFirst({
      where: { id: params.id, companyId: auth.context.companyId },
      select: { items: { select: { lineTotal: true } } },
    });
    if (order) {
      const outstanding = order.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
      if (payload.partialAmount >= outstanding) {
        return NextResponse.json(
          { message: "O valor parcial não pode ser igual ou maior que o total devido. Use a baixa total." },
          { status: 400 },
        );
      }
    }
  }

  try {
    const result = await serviceOrderService.update(params.id, payload, {
      companyId: auth.context.companyId,
      userId: auth.context.userId,
    });

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
    const result = await serviceOrderService.remove(params.id, {
      companyId: auth.context.companyId,
      userId: auth.context.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
