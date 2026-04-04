import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const aVista = await prisma.serviceOrder.updateMany({
    where: {
      paymentTerm: "A_VISTA",
      paymentStatus: "PENDENTE",
    },
    data: { paymentStatus: "PAGO" },
  });

  const settled = await prisma.$queryRaw`
    UPDATE "public"."ServiceOrder" so
    SET "paymentStatus" = 'PAGO'
    WHERE so."paymentStatus" = 'PENDENTE'
    AND so."paymentTerm" = 'A_PRAZO'
    AND EXISTS (
      SELECT 1 FROM "public"."AccountReceivable" ar
      WHERE ar."serviceOrderId" = so.id
      AND ar.status = 'PAGO'
      AND NOT EXISTS (
        SELECT 1 FROM "public"."AccountReceivable" ar2
        WHERE ar2."serviceOrderId" = so.id
        AND ar2.status != 'PAGO'
      )
    )
  `;

  const partial = await prisma.serviceOrder.updateMany({
    where: {
      number: { startsWith: "FEC-" },
      status: "EM_ANDAMENTO",
      paymentStatus: "PENDENTE",
    },
    data: { paymentStatus: "PAGO_PARCIAL" },
  });

  console.log("À vista pagas:", aVista.count);
  console.log("A prazo pagas:", settled);
  console.log("Parciais:", partial.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
