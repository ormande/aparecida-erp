# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ordens-de-servico.spec.ts >> criação de OS avulsa com serviço manual e Pix conclui com toast e volta à listagem
- Location: e2e\ordens-de-servico.spec.ts:16:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Cliente avulso')

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
  3  | test("listagem de OS carrega", async ({ page }) => {
  4  |   await page.goto("/ordens-de-servico");
  5  |   await expect(page.getByRole("heading", { name: "Ordens de Servico" })).toBeVisible();
  6  |   await expect(page.getByPlaceholder("Buscar por numero, cliente ou placa")).toBeVisible();
  7  | });
  8  | 
  9  | test('botão "Nova OS" navega para /ordens-de-servico/nova', async ({ page }) => {
  10 |   await page.goto("/ordens-de-servico");
  11 |   await page.getByRole("link", { name: /Nova OS/i }).click();
  12 |   await expect(page).toHaveURL(/\/ordens-de-servico\/nova(\?.*)?$/);
  13 |   await expect(page.getByRole("heading", { name: "Nova Ordem de Serviço" })).toBeVisible();
  14 | });
  15 | 
  16 | test("criação de OS avulsa com serviço manual e Pix conclui com toast e volta à listagem", async ({ page }) => {
  17 |   await page.goto("/ordens-de-servico/nova?standalone=1");
> 18 |   await page.getByLabel("Cliente avulso").fill("Cliente avulso E2E");
     |                                           ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  19 |   await page.getByRole("combobox").filter({ hasText: /Selecione a unidade/ }).click();
  20 |   await page.getByRole("option", { name: "Unidade Principal" }).click();
  21 |   await expect(page.getByLabel("Forma de pagamento")).toHaveValue("Pix");
  22 |   await page.getByPlaceholder("Serviço 1").fill("Serviço manual E2E");
  23 |   const valorServico = page.locator("input[inputmode=\"decimal\"]").first();
  24 |   await valorServico.click();
  25 |   await valorServico.press("Control+a");
  26 |   await valorServico.type("15000");
  27 |   await page.getByRole("button", { name: "Abrir OS" }).click();
  28 |   await expect(page.getByText("OS criada com sucesso!")).toBeVisible();
  29 |   await expect(page).toHaveURL(/\/ordens-de-servico$/);
  30 | });
  31 | 
```