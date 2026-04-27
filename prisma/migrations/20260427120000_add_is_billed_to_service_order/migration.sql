ALTER TABLE "ServiceOrder"
ADD COLUMN "isBilled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ServiceOrder" so
SET "isBilled" = true
WHERE EXISTS (
  SELECT 1
  FROM "AccountReceivable" ar
  WHERE ar."serviceOrderId" = so."id"
);
