import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
    }

    const now = new Date();

    const [receivables, payables] = await Promise.all([
      prisma.accountReceivable.updateMany({
        where: {
          status: "PENDENTE",
          dueDate: { lt: now },
        },
        data: { status: "VENCIDO" },
      }),
      prisma.accountPayable.updateMany({
        where: {
          status: "PENDENTE",
          dueDate: { lt: now },
        },
        data: { status: "VENCIDO" },
      }),
    ]);

    return NextResponse.json({
      receivablesUpdated: receivables.count,
      payablesUpdated: payables.count,
    });
  } catch {
    return NextResponse.json({ message: "Falha ao marcar recebíveis e pagáveis como vencidos." }, { status: 500 });
  }
}

