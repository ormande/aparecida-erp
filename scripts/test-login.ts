import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "teste@aparecida-test.local" },
    include: {
      units: {
        include: { unit: true },
      },
    },
  });

  if (!user) {
    console.log("Usuário não encontrado");
    return;
  }

  if (!user.passwordHash) {
    console.log("Usuário sem passwordHash");
    return;
  }

  const matches = await compare("123456", user.passwordHash);
  console.log("Senha correta:", matches);
  console.log("Status:", user.status);
  console.log("Unidades:", user.units.length);
  console.log("AccessLevel:", user.accessLevel);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());