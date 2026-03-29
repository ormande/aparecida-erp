# Aparecida ERP

Protótipo navegável completo de um ERP web para a **Borracharia Nossa Senhora Aparecida**, construído com Next.js 14, TypeScript, Tailwind CSS, shadcn/ui e dados mockados.

## Como rodar o projeto

1. Instale as dependências:

```bash
npm install
```

2. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

3. Acesse [http://localhost:3000](http://localhost:3000).

O projeto roda sem nenhuma variável de ambiente configurada. Para entrar, use o botão **Entrar como demo**.

## Como configurar o `.env`

1. Copie o arquivo `.env.example` para `.env.local`.
2. Preencha apenas quando for ativar banco, NextAuth ou Google Login.
3. Enquanto isso não acontece, o sistema continua funcional com mocks e autenticação demo.

## Como ativar o Login com Google

1. Crie um projeto no Google Cloud Console.
2. Ative a API de identidade do Google.
3. Gere um OAuth Client ID do tipo Web.
4. Adicione a URI `http://localhost:3000/api/auth/callback/google`.
5. Preencha no `.env.local`:
   `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
6. Em [`/lib/auth.ts`](/C:/Users/User/Desktop/Sistemas/Aparecida%20ERP/lib/auth.ts), descomente o provider do Google.
7. Em [`/app/api/auth/[...nextauth]/route.ts`](/C:/Users/User/Desktop/Sistemas/Aparecida%20ERP/app/api/auth/[...nextauth]/route.ts), substitua o fallback pelo handler do NextAuth.

## Como ativar o módulo de estoque

1. Abra [`/lib/config.ts`](/C:/Users/User/Desktop/Sistemas/Aparecida%20ERP/lib/config.ts).
2. Altere `ESTOQUE_ATIVO` para `true`.
3. Reinicie o projeto se necessário.
4. A rota `/estoque` continuará existindo, mas o item de menu só aparece quando a flag estiver ativa.

## Deploy no Vercel + Railway

1. Suba o projeto para um repositório Git.
2. Crie um banco PostgreSQL no Railway e copie a `DATABASE_URL`.
3. Importe o repositório no Vercel.
4. Configure as variáveis do `.env.example` no painel da Vercel.
5. Se usar autenticação Google, atualize a URL autorizada para o domínio final:
   `https://seu-dominio.com/api/auth/callback/google`
6. Faça o deploy.

## Estrutura principal

- `app/`: rotas e telas do protótipo.
- `components/`: layout, autenticação demo e componentes reutilizáveis.
- `lib/mock-data.ts`: base central de dados fake.
- `lib/config.ts`: flags de módulos e workspaces.
- `hooks/use-auth.ts`: sessão demo via `localStorage`.
