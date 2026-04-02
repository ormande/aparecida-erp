import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';
const p = new PrismaClient();
const user = await p.user.findFirst({ 
  where: { email: 'teste@aparecida-test.local' },
  select: { passwordHash: true }
});
const match = await compare('123456', user.passwordHash);
console.log('Senha correta:', match);
await p.$disconnect();