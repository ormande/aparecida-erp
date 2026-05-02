/**
 * Reset do banco de PRODUÇÃO.
 *
 * APAGA TODOS OS DADOS de negócio (empresa, usuários, OS, financeiro, etc.)
 * e desbloqueia o fluxo de primeiro acesso (AppSetup.isInitialized = false).
 * NÃO apaga _prisma_migrations, Account, Session, VerificationToken (NextAuth).
 *
 * Só executa se CONFIRM_PROD_RESET="CONFIRMO-APAGAR-TUDO" estiver definido.
 * Nunca adicione essa variável ao .env de produção permanentemente.
 *
 * Uso:
 *   CONFIRM_PROD_RESET="CONFIRMO-APAGAR-TUDO" node scripts/reset-prod-db.mjs
 *
 * Ou com dotenv:
 *   dotenv -e .env -- cross-env CONFIRM_PROD_RESET="CONFIRMO-APAGAR-TUDO" node scripts/reset-prod-db.mjs
 */

import { PrismaClient } from "@prisma/client";

const REQUIRED_CONFIRMATION = "CONFIRMO-APAGAR-TUDO";

const prisma = new PrismaClient();

async function main() {
  const confirmation = process.env.CONFIRM_PROD_RESET;

  if (confirmation !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Operação bloqueada.\n` +
        `Para confirmar o reset de PRODUÇÃO, defina a variável de ambiente:\n` +
        `  CONFIRM_PROD_RESET="${REQUIRED_CONFIRMATION}"\n` +
        `Nunca deixe essa variável permanente no ambiente de produção.`,
    );
  }

  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.trim()) {
    throw new Error("DATABASE_URL não definido ou vazio.");
  }

  const lower = databaseUrl.toLowerCase();
  const looksLikeTest = ["localhost", "127.0.0.1", "::1", "test", "staging", "sandbox", "homolog"].some(
    (frag) => lower.includes(frag),
  );

  if (looksLikeTest) {
    throw new Error(
      "DATABASE_URL parece ser de teste/desenvolvimento. Use db:reset:test para esses ambientes.",
    );
  }

  console.log("⚠️  RESET DE PRODUÇÃO INICIADO");
  console.log(`   Banco: ${databaseUrl.replace(/:\/\/[^@]+@/, "://***@")}`);
  console.log("");

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.userUnit.deleteMany(),
    prisma.serviceOrderItem.deleteMany(),
    prisma.serviceOrderProduct.deleteMany(),
    prisma.accountReceivable.deleteMany(),
    prisma.accountPayable.deleteMany(),
    prisma.serviceOrder.deleteMany(),
    prisma.serviceCatalog.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.product.deleteMany(),
    prisma.user.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.company.deleteMany(),
    prisma.appSetup.deleteMany(),
  ]);

  console.log("✓ Dados de negócio apagados.");
  console.log("✓ AppSetup resetado — o fluxo de primeiro acesso está desbloqueado.");
  console.log("  Acesse a aplicação para realizar o cadastro inicial.");
}

main()
  .catch((error) => {
    console.error("\n❌ ERRO:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
