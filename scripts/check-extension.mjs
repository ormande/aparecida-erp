import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  await p.$queryRawUnsafe('CREATE EXTENSION IF NOT EXISTS unaccent');
  console.log('ok - extensão instalada');
} catch (e) {
  console.error('erro:', e.message);
} finally {
  await p.$disconnect();
}