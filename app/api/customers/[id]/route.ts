import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { personSchema } from "@/lib/person-schema";
import { customerService } from "@/services/customer.service";
import { ServiceError } from "@/services/service-error";

const customerSchema = personSchema.merge(
  z.object({
    nomeCompleto: z.string().max(150).optional().default(""),
    nomeFantasia: z.string().max(150).optional().default(""),
    razaoSocial: z.string().max(150).optional().default(""),
    situacao: z.enum(["Ativo", "Inativo"]),
    celular: z.string().min(1).max(20),
    whatsapp: z.string().max(20).optional().default(""),
    email: z.string().optional().default(""),
    observacoes: z.string().max(2000).optional().default(""),
  }),
);

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ message: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await customerService.getById(params.id, {
      companyId: auth.context.companyId,
      unitId: auth.context.activeUnitId,
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

  let payload: z.infer<typeof customerSchema>;
  try {
    payload = customerSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await customerService.update(params.id, payload, {
      companyId: auth.context.companyId,
      unitId: auth.context.activeUnitId,
      userId: auth.context.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
