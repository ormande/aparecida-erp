import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fecOutstandingFromItems } from "@/lib/service-order-reference";
import { serviceOrderService } from "@/services/service-order.service";
import { ServiceError } from "@/services/service-error";

const settleBodySchema = z.object({
  discountAmount: z.coerce.number().min(0).optional().default(0),
  partialAmount: z.coerce.number().min(0).max(999999.99).optional().default(0),
  paymentMethod: z.string().max(100).optional().default(""),
});

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    const bodyKey = error.message.includes("not found") ? "error" : "message";
    return NextResponse.json({ [bodyKey]: error.message, details: error.details }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  let body: z.infer<typeof settleBodySchema>;
  try {
    body = settleBodySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.partialAmount > 0) {
    const order = await prisma.serviceOrder.findFirst({
      where: { id: params.id, companyId: auth.context.companyId },
      select: {
        items: { select: { lineTotal: true, description: true } },
      },
    });
    if (order) {
      const outstanding = fecOutstandingFromItems(order.items);
      if (body.partialAmount >= outstanding) {
        return NextResponse.json(
          { message: "O valor parcial não pode ser igual ou maior que o total devido. Use a baixa total." },
          { status: 400 },
        );
      }
    }
  }

  try {
    const result = await serviceOrderService.update(
      params.id,
      {
        mode: "settle",
        discountAmount: body.discountAmount,
        partialAmount: body.partialAmount,
        paymentMethod: body.paymentMethod,
      },
      {
        companyId: auth.context.companyId,
        userId: auth.context.userId,
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
