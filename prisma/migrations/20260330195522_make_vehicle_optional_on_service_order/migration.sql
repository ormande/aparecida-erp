-- DropForeignKey
ALTER TABLE "public"."ServiceOrder" DROP CONSTRAINT "ServiceOrder_vehicleId_fkey";

-- AlterTable
ALTER TABLE "public"."ServiceOrder" ALTER COLUMN "vehicleId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrder" ADD CONSTRAINT "ServiceOrder_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
