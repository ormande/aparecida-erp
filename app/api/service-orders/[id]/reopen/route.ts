import { NextResponse } from "next/server";

import { getRequiredSessionContext } from "@/lib/auth";
import { serviceOrderService } from "@/services/service-order.service";
import { ServiceError } from "@/services/service-error";

function handleServiceError(error: unknown) {
  if (error instanceof ServiceError) {
    const bodyKey = error.message.includes("not found") ? "error" : "message";
    return NextResponse.json({ [bodyKey]: error.message, details: error.details }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const result = await serviceOrderService.update(
      params.id,
      { mode: "reopen" },
      {
        companyId: auth.context.companyId,
        userId: auth.context.userId,
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceError(error);
  }
}
