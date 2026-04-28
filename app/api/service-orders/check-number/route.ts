import { NextRequest, NextResponse } from "next/server";

import { getRequiredSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function buildOrderNumber(year: number, sequence: number) {
  return `OS-${year}-${String(sequence).padStart(5, "0")}`;
}

export async function GET(request: NextRequest) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  const rawNumber = request.nextUrl.searchParams.get("number");
  const numeric = Number(rawNumber ?? "");
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 99999) {
    return NextResponse.json({ exists: false });
  }

  const formattedNumber = buildOrderNumber(new Date().getFullYear(), numeric);
  const existing = await prisma.serviceOrder.findFirst({
    where: {
      companyId: auth.context.companyId,
      number: formattedNumber,
    },
    select: { id: true },
  });

  return NextResponse.json({ exists: Boolean(existing), number: formattedNumber });
}
