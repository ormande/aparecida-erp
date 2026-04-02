# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: financeiro.spec.ts >> criação de recebível avulso exibe toast de sucesso
- Location: e2e\financeiro.spec.ts:24:5

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
  3  | function formatDateInput(d: Date) {
  4  |   const y = d.getFullYear();
  5  |   const m = String(d.getMonth() + 1).padStart(2, "0");
  6  |   const day = String(d.getDate()).padStart(2, "0");
  7  |   return `${y}-${m}-${day}`;
  8  | }
  9  | 
  10 | test("página a receber carrega os cards de totais", async ({ page }) => {
  11 |   await page.goto("/financeiro/receber");
  12 |   await expect(page.getByRole("heading", { name: "Contas a Receber" })).toBeVisible();
  13 |   await expect(page.getByText("Total pendente")).toBeVisible();
  14 |   await expect(page.getByText("Total vencido")).toBeVisible();
  15 |   await expect(page.getByText("Total recebido no mês")).toBeVisible();
  16 | });
  17 | 
  18 | test('botão "Novo recebível" abre o dialog', async ({ page }) => {
  19 |   await page.goto("/financeiro/receber");
  20 |   await page.getByRole("button", { name: "Novo recebível" }).click();
  21 |   await expect(page.getByRole("dialog", { name: "Novo recebível avulso" })).toBeVisible();
  22 | });
  23 | 
  24 | test("criação de recebível avulso exibe toast de sucesso", async ({ page }) => {
  25 |   const nomeCliente = `Cliente Fin E2E ${Date.now()}`;
  26 |   await page.goto("/clientes");
> 27 |   await page.getByRole("button", { name: "Novo cliente" }).click();
     |                                                            ^ Error: locator.click: Test timeout of 30000ms exceeded.
  28 |   const dialogCliente = page.getByRole("dialog", { name: "Novo cliente" });
  29 |   await dialogCliente.getByLabel(/Nome completo/i).fill(nomeCliente);
  30 |   await dialogCliente.getByLabel("CPF", { exact: true }).fill("11144477735");
  31 |   await dialogCliente.getByLabel(/Telefone celular/i).fill("21988776655");
  32 |   await dialogCliente.getByRole("button", { name: "Salvar cliente" }).click();
  33 |   await expect(page.getByText("Cliente cadastrado com sucesso!")).toBeVisible();
  34 | 
  35 |   await page.goto("/financeiro/receber");
  36 |   await page.getByRole("button", { name: "Novo recebível" }).click();
  37 |   const dialog = page.getByRole("dialog", { name: "Novo recebível avulso" });
  38 |   await dialog.getByRole("combobox").filter({ hasText: /Selecione o cliente/ }).click();
  39 |   await page.getByRole("option", { name: new RegExp(nomeCliente) }).click();
  40 |   await dialog.getByLabel("Descrição").fill("Recebível avulso E2E");
  41 |   await dialog.getByLabel("Valor").fill("199.9");
  42 |   const vencimento = new Date();
  43 |   vencimento.setDate(vencimento.getDate() + 30);
  44 |   await dialog.getByLabel("Vencimento").fill(formatDateInput(vencimento));
  45 |   await dialog.getByRole("button", { name: "Salvar recebível" }).click();
  46 |   await expect(page.getByText("Recebível cadastrado com sucesso!")).toBeVisible();
  47 | });
  48 | 
```