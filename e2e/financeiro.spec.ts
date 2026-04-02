import { expect, test } from "@playwright/test";

function formatDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

test("página a receber carrega os cards de totais", async ({ page }) => {
  await page.goto("/financeiro/receber");
  await expect(page.getByRole("heading", { name: "Contas a Receber" })).toBeVisible();
  await expect(page.getByText("Total pendente")).toBeVisible();
  await expect(page.getByText("Total vencido")).toBeVisible();
  await expect(page.getByText("Total recebido no mês")).toBeVisible();
});

test('botão "Novo recebível" abre o dialog', async ({ page }) => {
  await page.goto("/financeiro/receber");
  await page.getByRole("button", { name: "Novo recebível" }).click();
  await expect(page.getByRole("dialog", { name: "Novo recebível avulso" })).toBeVisible();
});

test("criação de recebível avulso exibe toast de sucesso", async ({ page }) => {
  const nomeCliente = `Cliente Fin E2E ${Date.now()}`;
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Novo cliente" }).click();
  const dialogCliente = page.getByRole("dialog", { name: "Novo cliente" });
  await dialogCliente.getByLabel(/Nome completo/i).fill(nomeCliente);
  await dialogCliente.getByLabel("CPF", { exact: true }).fill("11144477735");
  await dialogCliente.getByLabel(/Telefone celular/i).fill("21988776655");
  await dialogCliente.getByRole("button", { name: "Salvar cliente" }).click();
  await expect(page.getByText("Cliente cadastrado com sucesso!")).toBeVisible();

  await page.goto("/financeiro/receber");
  await page.getByRole("button", { name: "Novo recebível" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo recebível avulso" });
  await dialog.getByRole("combobox").filter({ hasText: /Selecione o cliente/ }).click();
  await page.getByRole("option", { name: new RegExp(nomeCliente) }).click();
  await dialog.getByLabel("Descrição").fill("Recebível avulso E2E");
  await dialog.getByLabel("Valor").fill("199.9");
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 30);
  await dialog.getByLabel("Vencimento").fill(formatDateInput(vencimento));
  await dialog.getByRole("button", { name: "Salvar recebível" }).click();
  await expect(page.getByText("Recebível cadastrado com sucesso!")).toBeVisible();
});
