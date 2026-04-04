CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDENTE', 'PAGO_PARCIAL', 'PAGO');
ALTER TABLE "public"."ServiceOrder" ADD COLUMN "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDENTE';
