import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { checkRole, getRequiredSessionContext } from "@/lib/auth";
import { personSchema } from "@/lib/person-schema";
import { customerService } from "@/services/customer.service";
import { ServiceError } from "@/services/service-error";

const customerSchema = personSchema.merge(
  z.object({
    nomeCompleto: z.string().max(150).optional().default(""),
    nomeFantasia: z.string().max(150).optional().default(""),
    razaoSocial: z.string().max(150).optional().default(""),
    situacao: z.enum(["Ativo", "Inativo"]),
    celular: z.string().min(1).max(20).refine(
      (val) => /^[\d\s\(\)\-\+]{8,20}$/.test(val.replace(/\s/g, "")),
      { message: "Telefone inválido. Informe apenas números, espaços, parênteses ou hífen." }
    ),
    whatsapp: z.string().max(20).optional().default(""),
    email: z.preprocess(
      (val) => (typeof val === "string" && val.trim() === "" ? null : val),
      z.string().email("E-mail inválido.").optional().nullable().default(null),
    ),
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
    await customerService.delete(params.id, {
      companyId: auth.context.companyId,
      userId: auth.context.userId,
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleServiceError(error);
  }
}
