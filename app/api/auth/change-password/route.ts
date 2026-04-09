import { hash, compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres."),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
  }

  let payload: z.infer<typeof changePasswordSchema>;
  try {
    payload = changePasswordSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
    }
    return NextResponse.json({ message: "Dados inválidos." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json({ message: "Usuário não encontrado." }, { status: 404 });
  }

  const currentMatches = await compare(payload.currentPassword, user.passwordHash);
  if (!currentMatches) {
    return NextResponse.json({ message: "Senha atual incorreta." }, { status: 400 });
  }

  const newHash = await hash(payload.newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ ok: true });
}
