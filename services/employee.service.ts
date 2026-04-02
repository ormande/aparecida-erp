import { mapUserToEmployee } from "@/lib/db-mappers";
import { getAuditPrisma } from "@/lib/prisma-audit";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/services/service-error";

type EmployeePayload = {
  nomeCompleto: string;
  email: string;
  telefone?: string;
  nivelAcesso: "Proprietário" | "Gestor" | "Funcionário";
  situacao: "Ativo" | "Inativo";
};

type EmployeeContext = {
  companyId: string;
  unitId: string;
  userId: string;
};

function mapAccessLevel(level: EmployeePayload["nivelAcesso"]): "PROPRIETARIO" | "GESTOR" | "FUNCIONARIO" {
  if (level === "Proprietário") {
    return "PROPRIETARIO";
  }
  if (level === "Gestor") {
    return "GESTOR";
  }
  return "FUNCIONARIO";
}

function mapStatus(status: EmployeePayload["situacao"]): "ATIVO" | "INATIVO" {
  return status === "Ativo" ? "ATIVO" : "INATIVO";
}

export const employeeService = {
  async list(context: Pick<EmployeeContext, "companyId">) {
    const users = await prisma.user.findMany({
      where: {
        companyId: context.companyId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessLevel: true,
        status: true,
      },
    });

    return {
      employees: users.map(mapUserToEmployee),
    };
  },

  async getById(id: string, context: Pick<EmployeeContext, "companyId">) {
    const user = await prisma.user.findFirst({
      where: {
        id,
        companyId: context.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessLevel: true,
        status: true,
      },
    });

    if (!user) {
      throw new ServiceError("Funcionário não encontrado.", 404);
    }

    return { employee: mapUserToEmployee(user) };
  },

  async create(payload: EmployeePayload, context: EmployeeContext) {
    const email = payload.email.trim().toLowerCase();

    const exists = await prisma.user.findFirst({
      where: {
        companyId: context.companyId,
        email,
      },
      select: { id: true },
    });

    if (exists) {
      throw new ServiceError("Já existe um funcionário com esse e-mail.", 409);
    }

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    const user = await db.user.create({
      data: {
        companyId: context.companyId,
        name: payload.nomeCompleto,
        email,
        phone: payload.telefone || null,
        accessLevel: mapAccessLevel(payload.nivelAcesso),
        status: mapStatus(payload.situacao),
        units: {
          create: {
            unitId: context.unitId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessLevel: true,
        status: true,
      },
    });

    return { employee: mapUserToEmployee(user) };
  },

  async update(id: string, payload: EmployeePayload, context: EmployeeContext) {
    const email = payload.email.trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: {
        id,
        companyId: context.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessLevel: true,
        status: true,
      },
    });

    if (!existing) {
      throw new ServiceError("Funcionário não encontrado.", 404);
    }

    const conflict = await prisma.user.findFirst({
      where: {
        companyId: context.companyId,
        email,
        id: { not: id },
      },
      select: { id: true },
    });

    if (conflict) {
      throw new ServiceError("Já existe um funcionário com esse e-mail.", 409);
    }

    const db = getAuditPrisma({
      userId: context.userId,
      companyId: context.companyId,
      activeUnitId: context.unitId,
    });

    const user = await db.user.update({
      where: {
        id,
      },
      data: {
        name: payload.nomeCompleto,
        email,
        phone: payload.telefone || null,
        accessLevel: mapAccessLevel(payload.nivelAcesso),
        status: mapStatus(payload.situacao),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accessLevel: true,
        status: true,
      },
    });

    return { employee: mapUserToEmployee(user) };
  },
};
