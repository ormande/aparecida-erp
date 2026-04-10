import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { personSchema } from "@/lib/person-schema";
import { ServiceError } from "@/services/service-error";
import { supplierService } from "@/services/supplier.service";

const supplierSchema = personSchema.merge(
  z.object({
    nomeCompleto: z.string().max(150).optional().default(""),
    nomeFantasia: z.string().max(150).optional().default(""),
    razaoSocial: z.string().max(150).optional().default(""),
    situacao: z.enum(["Ativo", "Inativo"]),
    categoria: z.enum(["Pneus", "Peças", "Insumos", "Serviços", "Outros"]),
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
    return NextResponse.json({ error: error.message, message: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET() {
  const auth = await getRequiredSessionContext({
    allowedRoles: ["PROPRIETARIO", "GESTOR"],
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await supplierService.list({ companyId: auth.context.companyId });
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

  let payload: z.infer<typeof supplierSchema>;
  try {
    payload = supplierSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await supplierService.create(payload, {
      companyId: auth.context.companyId,
      userId: auth.context.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
