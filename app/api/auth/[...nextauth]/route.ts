/*
  Rota preparada para futura ativação do NextAuth.
  Exemplo de implementação quando o Google OAuth estiver configurado:

  import NextAuth from "next-auth";
  import { authOptions } from "@/lib/auth";

  const handler = NextAuth(authOptions);
  export { handler as GET, handler as POST };
*/

export async function GET() {
  return Response.json(
    {
      active: false,
      message: "Autenticação Google ainda não configurada. Use o login demo por enquanto.",
    },
    { status: 501 },
  );
}

export async function POST() {
  return GET();
}
