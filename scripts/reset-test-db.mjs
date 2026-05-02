import { PrismaClient } from "@prisma/client";
import { assertTestDatabaseDestructive } from "./assert-test-database.mjs";

const prisma = new PrismaClient();

async function main() {
  assertTestDatabaseDestructive("ALLOW_DB_RESET", "Reset do banco de teste");

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.verificationToken.deleteMany(),
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

  console.log("✓ Banco de teste resetado.");
  console.log("  Execute db:seed:test para criar os dados de teste.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
