import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getRequiredSessionContext } from "@/lib/auth";
import { productService } from "@/services/product.service";
import { ServiceError } from "@/services/service-error";

const productSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  brand: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  unit: z.enum(["UN", "PAR", "KIT", "L", "ML", "KG", "G", "CX"]).optional().default("UN"),
  internalCode: z.string().max(50).optional(),
  costPrice: z.union([z.coerce.number().min(0), z.null()]).optional(),
  salePrice: z.coerce.number().min(0),
  isActive: z.boolean().optional().default(true),
  notes: z.string().max(500).optional(),
});

function handleError(error: unknown) {
  if (error instanceof ServiceError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET(request: NextRequest) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) return auth.response;
  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  const isActiveParam = request.nextUrl.searchParams.get("isActive");
  const isActive = isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;
  try {
    const result = await productService.list({ companyId: auth.context.companyId }, { search, category, isActive });
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  const auth = await getRequiredSessionContext();
  if (!auth.ok) return auth.response;
  try {
    const payload = productSchema.parse(await request.json());
    const result = await productService.create(payload, { companyId: auth.context.companyId });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request body", details: error.flatten() }, { status: 400 });
    }
    return handleError(error);
  }
}
