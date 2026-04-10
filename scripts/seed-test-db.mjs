import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { assertTestDatabaseDestructive } from "./assert-test-database.mjs";

const prisma = new PrismaClient();

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function main() {
  assertTestDatabaseDestructive("ALLOW_DB_SEED", "Seed de teste");

  const users = await prisma.user.count();
  if (users > 0) {
    throw new Error("O banco ja possui usuarios. Rode o reset antes do seed.");
  }

  const companyName = process.env.TEST_COMPANY_NAME || "Empresa Homologacao";
  const unitName = process.env.TEST_UNIT_NAME || "Unidade Principal";
  const ownerName = process.env.TEST_OWNER_NAME || "Proprietario Teste";
  const ownerEmail = (process.env.TEST_OWNER_EMAIL || "teste@empresa-homologacao.local").toLowerCase();
  const ownerPassword = process.env.TEST_OWNER_PASSWORD || "123456";

  const company = await prisma.company.create({
    data: {
      name: companyName,
      slug: slugify(companyName) || "empresa-homologacao",
    },
  });

  const unit = await prisma.unit.create({
    data: {
      companyId: company.id,
      name: unitName,
      slug: slugify(unitName) || "unidade-principal",
    },
  });

  const passwordHash = await hash(ownerPassword, 10);
  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      name: ownerName,
      email: ownerEmail,
      passwordHash,
      accessLevel: "PROPRIETARIO",
      status: "ATIVO",
      units: {
        create: {
          unitId: unit.id,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      companyId: company.id,
      unitId: unit.id,
      userId: user.id,
      entityType: "test_seed",
      entityId: user.id,
      action: "CREATE",
      afterData: {
        companyName,
        unitName,
        ownerEmail,
        sourceModule: "seed_test_db",
      },
    },
  });

  await prisma.appSetup.upsert({
    where: { id: 1 },
    update: { isInitialized: true, initializedAt: new Date() },
    create: { id: 1, isInitialized: true, initializedAt: new Date() },
  });

  console.log("✓ Seed de teste criado com sucesso.");
  console.log(`  Empresa : ${companyName}`);
  console.log(`  Email   : ${ownerEmail}`);
  console.log(`  Senha   : ${ownerPassword}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
