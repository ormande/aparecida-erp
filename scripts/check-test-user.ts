import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "teste@aparecida-test.local" },
    select: { id: true, email: true, status: true, passwordHash: true },
  });
  console.log(user ? user : "Usuário não encontrado");
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());