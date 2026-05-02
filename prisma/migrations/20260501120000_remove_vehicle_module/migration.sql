-- DropForeignKey
ALTER TABLE "ServiceOrder" DROP CONSTRAINT IF EXISTS "ServiceOrder_vehicleId_fkey";

-- AlterTable
ALTER TABLE "ServiceOrder" DROP COLUMN IF EXISTS "vehicleId";
ALTER TABLE "ServiceOrder" DROP COLUMN IF EXISTS "mileage";

-- DropTable
DROP TABLE IF EXISTS "Vehicle";
