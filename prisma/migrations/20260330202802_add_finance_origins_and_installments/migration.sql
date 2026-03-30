-- CreateEnum
CREATE TYPE "public"."ReceivableOriginType" AS ENUM ('SERVICE_ORDER', 'MANUAL');

-- AlterTable
ALTER TABLE "public"."AccountPayable" ADD COLUMN     "installmentCount" INTEGER,
ADD COLUMN     "installmentGroupId" TEXT,
ADD COLUMN     "installmentNumber" INTEGER;

-- AlterTable
ALTER TABLE "public"."AccountReceivable" ADD COLUMN     "installmentCount" INTEGER,
ADD COLUMN     "installmentGroupId" TEXT,
ADD COLUMN     "installmentNumber" INTEGER,
ADD COLUMN     "originType" "public"."ReceivableOriginType" NOT NULL DEFAULT 'MANUAL';

-- CreateIndex
CREATE INDEX "AccountPayable_companyId_unitId_dueDate_idx" ON "public"."AccountPayable"("companyId", "unitId", "dueDate");

-- CreateIndex
CREATE INDEX "AccountReceivable_companyId_unitId_dueDate_idx" ON "public"."AccountReceivable"("companyId", "unitId", "dueDate");
