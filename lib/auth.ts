import type { NextAuthOptions } from "next-auth";

/*
  Estrutura preparada para ativar o login com Google no futuro.
  Quando quiser ativar:
  1. Descomente o provider abaixo.
  2. Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env.local.
  3. Remova o fallback de rota em app/api/auth/[...nextauth]/route.ts.
*/

export const authOptions: NextAuthOptions = {
  providers: [
    /*
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    */
  ],
  pages: {
    signIn: "/login",
  },
};
