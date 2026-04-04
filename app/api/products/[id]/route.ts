import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getRequiredSessionContext } from "@/lib/auth";
import { productService } from "@/services/product.service";
import { ServiceError } from "@/services/service-error";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  brand: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  unit: z.enum(["UN", "PAR", "KIT", "L", "ML", "KG", "G", "CX"]).optional(),
  internalCode: z.string().max(50).optional(),
  costPrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

function handleError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) return auth.response;
  try {
    const result = await productService.getById(params.id, { companyId: auth.context.companyId });
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) return auth.response;
  try {
    const payload = patchSchema.parse(await request.json());
    const result = await productService.update(params.id, payload, { companyId: auth.context.companyId });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return handleError(error);
  }
}
