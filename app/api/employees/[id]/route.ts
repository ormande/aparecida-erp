import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getRequiredSessionContext } from "@/lib/auth";
import { employeeService } from "@/services/employee.service";
import { ServiceError } from "@/services/service-error";

const employeeSchema = z.object({
  nomeCompleto: z.string().min(2).max(150),
  email: z.string().email(),
  telefone: z.string().max(20).optional().default(""),
  nivelAcesso: z.enum(["Proprietário", "Gestor", "Funcionário"]),
  situacao: z.enum(["Ativo", "Inativo"]),
});

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
    const result = await employeeService.getById(params.id, { companyId: auth.context.companyId });
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

  let payload: z.infer<typeof employeeSchema>;
  try {
    payload = employeeSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await employeeService.update(params.id, payload, {
      companyId: auth.context.companyId,
      unitId: auth.context.activeUnitId,
      userId: auth.context.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
