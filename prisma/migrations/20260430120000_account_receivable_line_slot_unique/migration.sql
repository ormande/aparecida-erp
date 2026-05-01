-- AlterTable
ALTER TABLE "AccountReceivable" ADD COLUMN "lineSlot" INTEGER NOT NULL DEFAULT 0;

-- Garantir par (serviceOrderId, lineSlot) único: vários recebíveis na mesma OS recebem slots sequenciais.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "serviceOrderId" ORDER BY "createdAt", id) - 1 AS new_slot
  FROM "AccountReceivable"
  WHERE "serviceOrderId" IS NOT NULL
)
UPDATE "AccountReceivable" AS ar
SET "lineSlot" = r.new_slot
FROM ranked r
WHERE ar.id = r.id;

-- CreateIndex
CREATE UNIQUE INDEX "AccountReceivable_serviceOrderId_lineSlot_key" ON "AccountReceivable"("serviceOrderId", "lineSlot");
