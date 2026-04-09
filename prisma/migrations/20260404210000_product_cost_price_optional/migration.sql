-- Preço de custo opcional (margem/custo virá de contas a receber quando houver).
ALTER TABLE "Product" ALTER COLUMN "costPrice" DROP NOT NULL;
