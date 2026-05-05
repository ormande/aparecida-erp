import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions, checkRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function translateEntity(entityType: string) {
  switch (entityType) {
    case "service_order":
      return "ordem de serviço";
    case "service_order_item":
      return "item de OS";
    case "service_catalog":
      return "serviço";
    case "customer":
      return "cliente";
    case "supplier":
      return "fornecedor";
    case "receivable":
      return "conta a receber";
    case "payable":
      return "conta a pagar";
    case "unit":
      return "unidade";
    case "company":
      return "empresa";
    case "system_setup":
      return "primeiro acesso";
    default:
      return entityType;
  }
}

function translateAction(action: string) {
  switch (action) {
    case "CREATE":
      return "criou";
    case "UPDATE":
      return "editou";
    case "DELETE":
      return "excluiu";
    case "STATUS_CHANGE":
      return "alterou o status de";
    case "LOGIN":
      return "entrou no sistema";
    case "LOGOUT":
      return "saiu do sistema";
    default:
      return action.toLowerCase();
  }
}

/** Texto identificador no payload (número, nome, descrição, etc.), sem cair no rótulo da entidade. */
function extractIdentifier(payload: Record<string, unknown>): string | null {
  const keys = [
    "number",
    "name",
    "referencedOrderNumber",
    "fullName",
    "tradeName",
    "legalName",
    "description",
    "email",
  ] as const;
  for (const key of keys) {
    const v = payload[key];
    if (typeof v === "string" && v.trim().length > 0) {
      return v.trim();
    }
  }
  return null;
}

function entityAndIdAreRedundant(entity: string, id: string): boolean {
  const e = entity.trim().toLowerCase();
  const i = id.trim().toLowerCase();
  if (i === e) {
    return true;
  }
  // Ex.: descrição já vem como "ordem de serviço OS-123" e a entidade é "ordem de serviço"
  if (i.startsWith(`${e} `) || i.startsWith(`${e}(`)) {
    return true;
  }
  return false;
}

function formatActionWithEntity(actionPhrase: string, entity: string, id: string | null): string {
  if (!id) {
    return `${actionPhrase} ${entity}.`;
  }
  if (entityAndIdAreRedundant(entity, id)) {
    return `${actionPhrase} ${id}.`;
  }
  return `${actionPhrase} ${entity} ${id}.`;
}

function buildSummary(log: {
  entityType: string;
  action: string;
  afterData: unknown;
  beforeData: unknown;
}) {
  const entity = translateEntity(log.entityType);
  const payload = (log.afterData ?? log.beforeData ?? {}) as Record<string, unknown>;
  const id = extractIdentifier(payload);

  if (log.action === "LOGIN" || log.action === "LOGOUT") {
    return entity === "primeiro acesso" ? "Concluiu o primeiro acesso do sistema." : `Usuário ${translateAction(log.action)}.`;
  }

  if (log.action === "STATUS_CHANGE") {
    if (!id || id.toLowerCase() === entity.toLowerCase()) {
      return `Alterou o status da ${entity}.`;
    }
    if (entityAndIdAreRedundant(entity, id)) {
      return `Alterou o status da ${id}.`;
    }
    return `Alterou o status da ${entity} ${id}.`;
  }

  return formatActionWithEntity(translateAction(log.action), entity, id);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  if (!checkRole(session, ["PROPRIETARIO"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      companyId: session.user.companyId,
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      unit: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
  });

  return NextResponse.json({
    logs: logs.map((log) => ({
      id: log.id,
      entityType: translateEntity(log.entityType),
      entityId: log.entityId,
      action: log.action,
      actionLabel: translateAction(log.action),
      summary: buildSummary(log),
      createdAt: log.createdAt.toISOString(),
      userName: log.user?.name ?? "Sistema",
      userEmail: log.user?.email ?? "",
      unitName: log.unit?.name ?? "Geral",
      beforeData: log.beforeData,
      afterData: log.afterData,
    })),
  });
}
