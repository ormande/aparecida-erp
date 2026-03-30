-- CreateEnum
CREATE TYPE "public"."PaymentTerm" AS ENUM ('A_VISTA', 'A_PRAZO');

-- DropForeignKey
ALTER TABLE "public"."ServiceOrder" DROP CONSTRAINT "ServiceOrder_customerId_fkey";

-- AlterTable
ALTER TABLE "public"."ServiceOrder" ADD COLUMN     "customerNameSnapshot" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "isStandalone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentTerm" "public"."PaymentTerm",
ALTER COLUMN "customerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrder" ADD CONSTRAINT "ServiceOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
