import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true, address: true, phone: true },
  });

  if (!company) {
    return NextResponse.json({ message: "Empresa não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ company });
}
