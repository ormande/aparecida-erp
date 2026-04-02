import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);

    return NextResponse.json(
      {
        status: "ok",
        db: "ok",
        timestamp,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        timestamp,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

