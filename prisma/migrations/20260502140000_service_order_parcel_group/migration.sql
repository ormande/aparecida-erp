-- Parcelamento real: grupo de N OS (uma por parcela).
ALTER TABLE "ServiceOrder" ADD COLUMN "parcelGroupId" TEXT;
ALTER TABLE "ServiceOrder" ADD COLUMN "parcelIndex" INTEGER;
ALTER TABLE "ServiceOrder" ADD COLUMN "parcelCount" INTEGER;

CREATE INDEX "ServiceOrder_companyId_parcelGroupId_idx" ON "ServiceOrder"("companyId", "parcelGroupId");
