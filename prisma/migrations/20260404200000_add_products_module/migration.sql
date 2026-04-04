CREATE TYPE "public"."ProductUnit" AS ENUM ('UN', 'PAR', 'KIT', 'L', 'ML', 'KG', 'G', 'CX');

CREATE TABLE "public"."Product" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "brand" TEXT,
  "category" TEXT,
  "unit" "public"."ProductUnit" NOT NULL DEFAULT 'UN',
  "internalCode" TEXT,
  "costPrice" DECIMAL(10,2) NOT NULL,
  "salePrice" DECIMAL(10,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ServiceOrderProduct" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "serviceOrderId" TEXT NOT NULL,
  "productId" TEXT,
  "description" TEXT NOT NULL,
  "unit" "public"."ProductUnit" NOT NULL DEFAULT 'UN',
  "quantity" DECIMAL(10,3) NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "totalPrice" DECIMAL(10,2) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceOrderProduct_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."ServiceOrder"
  ADD COLUMN "laborSubtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "productsSubtotal" DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "public"."Product"
  ADD CONSTRAINT "Product_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ServiceOrderProduct"
  ADD CONSTRAINT "ServiceOrderProduct_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ServiceOrderProduct"
  ADD CONSTRAINT "ServiceOrderProduct_serviceOrderId_fkey"
  FOREIGN KEY ("serviceOrderId") REFERENCES "public"."ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ServiceOrderProduct"
  ADD CONSTRAINT "ServiceOrderProduct_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Product_companyId_isActive_idx" ON "public"."Product"("companyId", "isActive");
CREATE INDEX "Product_companyId_name_idx" ON "public"."Product"("companyId", "name");
CREATE INDEX "ServiceOrderProduct_companyId_serviceOrderId_idx" ON "public"."ServiceOrderProduct"("companyId", "serviceOrderId");
CREATE INDEX "ServiceOrderProduct_serviceOrderId_idx" ON "public"."ServiceOrderProduct"("serviceOrderId");
