import type { Prisma, ProductUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/services/service-error";

type ProductPayload = {
  name: string;
  description?: string;
  brand?: string;
  category?: string;
  unit?: string;
  internalCode?: string;
  costPrice: number;
  salePrice: number;
  isActive?: boolean;
  notes?: string;
};

export type ProductPatchPayload = {
  name?: string;
  description?: string;
  brand?: string;
  category?: string;
  unit?: string;
  internalCode?: string;
  costPrice?: number;
  salePrice?: number;
  isActive?: boolean;
  notes?: string;
};

type ProductContext = {
  companyId: string;
};

export const productService = {
  async list(context: ProductContext, filters?: { search?: string; category?: string; isActive?: boolean }) {
    const products = await prisma.product.findMany({
      where: {
        companyId: context.companyId,
        isActive: filters?.isActive !== undefined ? filters.isActive : undefined,
        name: filters?.search ? { contains: filters.search, mode: "insensitive" } : undefined,
        category: filters?.category ? { equals: filters.category } : undefined,
      },
      orderBy: { name: "asc" },
    });
    return { products };
  },

  async getById(id: string, context: ProductContext) {
    const product = await prisma.product.findFirst({
      where: { id, companyId: context.companyId },
    });
    if (!product) throw new ServiceError("Produto não encontrado.", 404);
    return { product };
  },

  async create(payload: ProductPayload, context: ProductContext) {
    const product = await prisma.product.create({
      data: {
        companyId: context.companyId,
        name: payload.name,
        description: payload.description || null,
        brand: payload.brand || null,
        category: payload.category || null,
        unit: (payload.unit as any) ?? "UN",
        internalCode: payload.internalCode || null,
        costPrice: payload.costPrice,
        salePrice: payload.salePrice,
        isActive: payload.isActive ?? true,
        notes: payload.notes || null,
      },
    });
    return { product };
  },

  async update(id: string, payload: ProductPatchPayload, context: ProductContext) {
    const existing = await prisma.product.findFirst({
      where: { id, companyId: context.companyId },
    });
    if (!existing) throw new ServiceError("Produto não encontrado.", 404);

    const data: Prisma.ProductUpdateInput = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.description !== undefined) data.description = payload.description || null;
    if (payload.brand !== undefined) data.brand = payload.brand || null;
    if (payload.category !== undefined) data.category = payload.category || null;
    if (payload.unit !== undefined) data.unit = payload.unit as ProductUnit;
    if (payload.internalCode !== undefined) data.internalCode = payload.internalCode || null;
    if (payload.costPrice !== undefined) data.costPrice = payload.costPrice;
    if (payload.salePrice !== undefined) data.salePrice = payload.salePrice;
    if (payload.isActive !== undefined) data.isActive = payload.isActive;
    if (payload.notes !== undefined) data.notes = payload.notes || null;

    const product =
      Object.keys(data).length > 0
        ? await prisma.product.update({ where: { id }, data })
        : existing;
    return { product };
  },
};
