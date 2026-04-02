# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> login com credenciais corretas redireciona para o dashboard
- Location: e2e\login.spec.ts:5:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard**" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img "Logo da Borracharia Nossa Senhora Aparecida" [ref=e9]
      - generic [ref=e10]:
        - heading "Aparecida ERP" [level=1] [ref=e11]
        - paragraph [ref=e12]: Acesso interno ao sistema da borracharia
    - generic [ref=e13]:
      - generic [ref=e14]:
        - generic [ref=e15]: E-mail
        - textbox "E-mail" [ref=e16]:
          - /placeholder: email@exemplo.com
          - text: teste@empresa-homologacao.local
      - generic [ref=e17]:
        - generic [ref=e18]: Senha
        - textbox "Senha" [ref=e19]:
          - /placeholder: Sua senha
          - text: "123456"
      - button "Entrar no sistema" [ref=e20] [cursor=pointer]:
        - img
        - text: Entrar no sistema
    - generic [ref=e21]: © 2026 Aparecida ERP
  - region "Notifications alt+T"
  - alert [ref=e22]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test.use({ storageState: { cookies: [], origins: [] } });
  4  | 
  5  | test("login com credenciais corretas redireciona para o dashboard", async ({ page }) => {
  6  |   await page.goto("/");
  7  |   await page.getByLabel("E-mail").fill("teste@empresa-homologacao.local");
  8  |   await page.getByLabel("Senha").fill("123456");
  9  |   await page.getByRole("button", { name: /Entrar no sistema/i }).click();
> 10 |   await page.waitForURL("**/dashboard**");
     |              ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  11 |   await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  12 | });
  13 | 
  14 | test("login com senha errada exibe mensagem de erro", async ({ page }) => {
  15 |   await page.goto("/");
  16 |   await page.getByLabel("E-mail").fill("teste@empresa-homologacao.local");
  17 |   await page.getByLabel("Senha").fill("senha-incorreta");
  18 |   await page.getByRole("button", { name: /Entrar no sistema/i }).click();
  19 |   await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
  20 | });
  21 | 
```