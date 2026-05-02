-- Use quando o Prisma Client já espera a coluna mas o banco não tem (migração registrada sem aplicar, ou outro ambiente).
-- Idempotente: pode rodar várias vezes.
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "billingInstallmentPlan" JSONB;
