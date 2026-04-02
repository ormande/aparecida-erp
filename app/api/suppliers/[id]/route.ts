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
    celular: z.string().min(1).max(20),
    whatsapp: z.string().max(20).optional().default(""),
    email: z.string().optional().default(""),
    observacoes: z.string().max(2000).optional().default(""),
  }),
);

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ error: error.message, message: error.message, details: error.details }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext({
    allowedRoles: ["PROPRIETARIO", "GESTOR"],
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await supplierService.getById(params.id, { companyId: auth.context.companyId });
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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
    const result = await supplierService.update(params.id, payload, {
      companyId: auth.context.companyId,
      unitId: auth.context.activeUnitId,
      userId: auth.context.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
