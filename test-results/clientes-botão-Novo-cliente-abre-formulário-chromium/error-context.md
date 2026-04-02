# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clientes.spec.ts >> botão "Novo cliente" abre formulário
- Location: e2e\clientes.spec.ts:9:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Novo cliente' })

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
      - generic [ref=e17]:
        - generic [ref=e18]: Senha
        - textbox "Senha" [ref=e19]:
          - /placeholder: Sua senha
      - button "Entrar no sistema" [disabled]:
        - img
        - text: Entrar no sistema
    - generic [ref=e20]: © 2026 Aparecida ERP
  - region "Notifications alt+T"
  - alert [ref=e21]
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | test("página de clientes carrega a tabela", async ({ page }) => {
  4  |   await page.goto("/clientes");
  5  |   await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
  6  |   await expect(page.getByRole("columnheader", { name: "Nome" })).toBeVisible();
  7  | });
  8  | 
  9  | test('botão "Novo cliente" abre formulário', async ({ page }) => {
  10 |   await page.goto("/clientes");
> 11 |   await page.getByRole("button", { name: "Novo cliente" }).click();
     |                                                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   await expect(page.getByRole("dialog", { name: "Novo cliente" })).toBeVisible();
  13 |   await expect(page.getByText("Os dados agora são persistidos no banco de dados do sistema.")).toBeVisible();
  14 | });
  15 | 
  16 | test("criação de cliente PF com nome e CPF válidos aparece na listagem", async ({ page }) => {
  17 |   const nome = `Cliente E2E ${Date.now()}`;
  18 |   await page.goto("/clientes");
  19 |   await page.getByRole("button", { name: "Novo cliente" }).click();
  20 |   const dialog = page.getByRole("dialog", { name: "Novo cliente" });
  21 |   await dialog.getByLabel(/Nome completo/i).fill(nome);
  22 |   await dialog.getByLabel("CPF", { exact: true }).fill("52998224725");
  23 |   await dialog.getByLabel(/Telefone celular/i).fill("11987654321");
  24 |   await dialog.getByRole("button", { name: "Salvar cliente" }).click();
  25 |   await expect(page.getByText("Cliente cadastrado com sucesso!")).toBeVisible();
  26 |   await expect(dialog).not.toBeVisible();
  27 |   await expect(page.getByRole("table")).toContainText(nome);
  28 | });
  29 | 
```