import { expect, test, type Page } from "@playwright/test";

test("página de clientes carrega a tabela", async ({ page }: { page: Page }) => {
  await page.goto("/clientes");
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Nome" })).toBeVisible();
});

test('botão "Novo cliente" abre formulário', async ({ page }: { page: Page }) => {
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Novo cliente" }).click();
  await expect(page.getByRole("dialog", { name: "Novo cliente" })).toBeVisible();
  await expect(page.getByText("Os dados agora são persistidos no banco de dados do sistema.")).toBeVisible();
});

test("criação de cliente PF com nome e CPF válidos aparece na listagem", async ({ page }: { page: Page }) => {
  const nome = `Cliente E2E ${Date.now()}`;
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Novo cliente" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo cliente" });
  await dialog.getByLabel(/Nome completo/i).fill(nome);
  await dialog.getByLabel("CPF", { exact: true }).fill("52998224725");
  await dialog.getByLabel(/Telefone celular/i).fill("11987654321");
  const customerRespPromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/customers") && resp.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Salvar cliente" }).click();
  await customerRespPromise;
  await expect(page.getByText("Cliente cadastrado com sucesso!")).toBeVisible({ timeout: 15_000 });
  await expect(dialog).not.toBeVisible();
  await page.getByPlaceholder(/Buscar/i).fill(nome);
  await expect(page.getByRole("table")).toContainText(nome, { timeout: 10_000 });
});
