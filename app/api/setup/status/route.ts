import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const usersCount = await prisma.user.count();

  return NextResponse.json({
    hasUsers: usersCount > 0,
  });
}
