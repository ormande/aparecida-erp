-- AlterTable
ALTER TABLE "public"."ServiceOrderItem" ADD COLUMN     "executedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."ServiceOrderItem" ADD CONSTRAINT "ServiceOrderItem_executedByUserId_fkey" FOREIGN KEY ("executedByUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
