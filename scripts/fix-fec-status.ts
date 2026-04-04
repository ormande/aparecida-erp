import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.serviceOrder.updateMany({
    where: {
      number: { startsWith: "FEC-" },
      status: "ABERTA",
      receivables: {
        some: {
          status: { in: ["PENDENTE", "VENCIDO"] },
          paidAt: { not: null },
        },
      },
    },
    data: {
      status: "EM_ANDAMENTO",
    },
  });

  console.log(`Registros atualizados: ${result.count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());