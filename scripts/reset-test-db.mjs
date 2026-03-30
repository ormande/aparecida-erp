import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function assertSafeReset() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const allowReset = process.env.ALLOW_DB_RESET === "true";
  const looksSafe =
    databaseUrl.includes("test") ||
    databaseUrl.includes("staging") ||
    databaseUrl.includes("sandbox") ||
    databaseUrl.includes("homolog");

  if (!allowReset || !looksSafe) {
    throw new Error(
      "Reset bloqueado. Use uma DATABASE_URL de teste/homologacao e rode com ALLOW_DB_RESET=true.",
    );
  }
}

async function main() {
  assertSafeReset();

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.userUnit.deleteMany(),
    prisma.serviceOrderItem.deleteMany(),
    prisma.accountReceivable.deleteMany(),
    prisma.accountPayable.deleteMany(),
    prisma.serviceOrder.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.serviceCatalog.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.user.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.company.deleteMany(),
  ]);

  console.log("Banco de teste resetado com sucesso.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
