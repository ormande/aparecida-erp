import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const setup = await prisma.appSetup.findUnique({ where: { id: 1 } });

  return NextResponse.json({
    hasUsers: setup?.isInitialized === true,
  });
}
