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
        number: true,
        items: { select: { lineTotal: true, description: true } },
        receivables: {
          select: {
            amount: true,
            status: true,
          },
        },
      },
    });
    if (order) {
      // Baixa parcial só é permitida quando existe exatamente UM título em
      // aberto — para OS regular OU FEC. Em ambos os casos com parcelas
      // múltiplas, o usuário deve baixar cada recebível pela linha
      // correspondente para evitar inconsistência nos valores.
      const pending = order.receivables.filter((r) => r.status === "PENDENTE" || r.status === "VENCIDO");
      if (pending.length > 1) {
        return NextResponse.json(
          {
            message:
              "Esta OS possui mais de um título em aberto (parcelas). Registre o pagamento parcial pela linha correspondente na lista ou quite cada título por vez.",
          },
          { status: 400 },
        );
      }
      if (pending.length === 1) {
        const cap = Number(pending[0].amount);
        if (body.partialAmount >= cap && cap > 0) {
          return NextResponse.json(
            {
              message:
                "O valor informado cobre o título em aberto inteiro. Confirme a baixa sem marcar pagamento parcial.",
            },
            { status: 400 },
          );
        }
      } else if (order.number.startsWith("FEC-")) {
        // FEC sem recebível associado — situação atípica; mantém a checagem
        // contra a soma dos items.
        const outstanding = fecOutstandingFromItems(order.items);
        if (body.partialAmount >= outstanding && outstanding > 0) {
          return NextResponse.json(
            { message: "O valor parcial não pode ser igual ou maior que o total devido. Use a baixa total." },
            { status: 400 },
          );
        }
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
