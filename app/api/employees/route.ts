import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { checkRole, getRequiredSessionContext } from "@/lib/auth";
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

export async function GET() {
  const auth = await getRequiredSessionContext({
    allowedRoles: ["PROPRIETARIO", "GESTOR"],
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await employeeService.list({ companyId: auth.context.companyId });
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

  if (!checkRole(auth.context.session, ["PROPRIETARIO"])) {
    return NextResponse.json({ message: "Sem permissão." }, { status: 403 });
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
    const result = await employeeService.create(payload, {
      companyId: auth.context.companyId,
      unitId: auth.context.activeUnitId,
      userId: auth.context.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleServiceError(error);
  }
}
