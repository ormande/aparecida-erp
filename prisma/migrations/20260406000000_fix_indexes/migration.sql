-- Remove índice redundante
DROP INDEX IF EXISTS "public"."ServiceOrderProduct_serviceOrderId_idx";

-- Adiciona índice de status em recebíveis
CREATE INDEX IF NOT EXISTS "AccountReceivable_companyId_status_idx"
  ON "public"."AccountReceivable"("companyId", "status");

-- Adiciona índice de status em pagáveis
CREATE INDEX IF NOT EXISTS "AccountPayable_companyId_status_idx"
  ON "public"."AccountPayable"("companyId", "status");
