import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { mapVehicleToAppVehicle } from "@/lib/db-mappers";
import { prisma } from "@/lib/prisma";

const vehicleSchema = z.object({
  plate: z.string().min(7),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.coerce.number().int(),
  color: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  clientId: z.string().min(1),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  const vehicles = await prisma.vehicle.findMany({
    where: {
      companyId: session.user.companyId,
      customerId: customerId || undefined,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      plate: true,
      brand: true,
      model: true,
      year: true,
      color: true,
      notes: true,
      customerId: true,
    },
  });

  return NextResponse.json({
    vehicles: vehicles.map(mapVehicleToAppVehicle),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  const payload = vehicleSchema.parse(await request.json());

  const vehicle = await prisma.vehicle.create({
    data: {
      companyId: session.user.companyId,
      customerId: payload.clientId,
      plate: payload.plate,
      brand: payload.brand,
      model: payload.model,
      year: payload.year,
      color: payload.color || null,
      notes: payload.notes || null,
    },
    select: {
      id: true,
      plate: true,
      brand: true,
      model: true,
      year: true,
      color: true,
      notes: true,
      customerId: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: session.user.companyId,
      userId: session.user.id,
      entityType: "vehicle",
      entityId: vehicle.id,
      action: "CREATE",
      afterData: {
        plate: vehicle.plate,
        customerId: vehicle.customerId,
      },
    },
  });

  return NextResponse.json({ vehicle: mapVehicleToAppVehicle(vehicle) }, { status: 201 });
}
