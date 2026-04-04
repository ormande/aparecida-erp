import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.serviceOrderProduct.deleteMany();
  await prisma.serviceOrderItem.deleteMany();
  await prisma.accountReceivable.deleteMany();
  await prisma.accountPayable.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.serviceCatalog.deleteMany();
  await prisma.product.deleteMany();
  await prisma.userUnit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.company.deleteMany();
  console.log("Banco zerado.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
