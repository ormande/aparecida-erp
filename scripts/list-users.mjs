import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const users = await p.user.findMany({ select: { email: true, status: true } });
console.log(JSON.stringify(users, null, 2));
await p.$disconnect();