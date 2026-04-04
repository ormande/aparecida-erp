import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions, checkRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function translateEntity(entityType: string) {
  switch (entityType) {
    case "service_order":
      return "ordem de serviço";
    case "service_catalog":
      return "serviço";
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

function buildSummary(log: {
  entityType: string;
  action: string;
  afterData: unknown;
  beforeData: unknown;
}) {
  const entity = translateEntity(log.entityType);
  const payload = (log.afterData ?? log.beforeData ?? {}) as Record<string, unknown>;
  const number = typeof payload.number === "string" ? payload.number : null;
  const name = typeof payload.name === "string" ? payload.name : null;
  const description = typeof payload.description === "string" ? payload.description : null;
  const target = number ?? name ?? description ?? entity;

  if (log.action === "LOGIN" || log.action === "LOGOUT") {
    return entity === "primeiro acesso" ? "Concluiu o primeiro acesso do sistema." : `Usuário ${translateAction(log.action)}.`;
  }

  if (log.action === "STATUS_CHANGE") {
    const label = target !== entity ? `${entity} ${target}` : entity;
    return `Alterou o status da ${label}.`;
  }

  return `${translateAction(log.action)} ${entity} ${target}.`;
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
