import { expect, test } from "@playwright/test";

test("listagem de OS carrega", async ({ page }) => {
  await page.goto("/ordens-de-servico");
  await expect(page.getByRole("heading", { name: "Ordens de Servico" })).toBeVisible();
  await expect(page.getByPlaceholder("Buscar por numero, cliente ou placa")).toBeVisible();
});

test('botão "Nova OS" navega para /ordens-de-servico/nova', async ({ page }) => {
  await page.goto("/ordens-de-servico");
  await page.getByRole("link", { name: /Nova OS/i }).click();
  await expect(page).toHaveURL(/\/ordens-de-servico\/nova(\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Nova Ordem de Serviço" })).toBeVisible();
});

test("criação de OS avulsa com serviço manual e Pix conclui com toast e volta à listagem", async ({ page }) => {
  await page.goto("/ordens-de-servico/nova?standalone=1");
  await page.getByLabel("Cliente avulso").fill("Cliente avulso E2E");
  await page.getByRole("combobox").filter({ hasText: /Selecione a unidade/ }).click();
  await page.getByRole("option", { name: "Unidade Principal" }).click();
  await expect(page.getByLabel("Forma de pagamento")).toHaveValue("Pix");
  await page.getByPlaceholder("Serviço 1").fill("Serviço manual E2E");
  const valorServico = page.locator("input[inputmode=\"decimal\"]").first();
  await valorServico.click();
  await valorServico.press("Control+a");
  await valorServico.type("15000");
  await page.getByRole("button", { name: "Abrir OS" }).click();
  await expect(page.getByText("OS criada com sucesso!")).toBeVisible();
  await expect(page).toHaveURL(/\/ordens-de-servico$/);
});
