import { expect, test, type Page } from "@playwright/test";

function formatDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

test("página a receber carrega os cards de totais", async ({ page }: { page: Page }) => {
  await page.goto("/financeiro/receber");
  await expect(page.getByRole("heading", { name: "Contas a Receber" })).toBeVisible();
  await expect(page.getByText("Total pendente")).toBeVisible();
  await expect(page.getByText("Total vencido")).toBeVisible();
  await expect(page.getByText("Total recebido no mês")).toBeVisible();
});

test('botão "Novo recebível" abre o dialog', async ({ page }: { page: Page }) => {
  await page.goto("/financeiro/receber");
  await page.getByRole("button", { name: "Novo recebível" }).click();
  await expect(page.getByRole("dialog", { name: "Novo recebível avulso" })).toBeVisible();
});

test("criação de recebível avulso exibe toast de sucesso", async ({ page }: { page: Page }) => {
  await page.goto("/financeiro/receber");
  await page.getByRole("button", { name: "Novo recebível" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo recebível avulso" });
  await dialog.getByRole("combobox").filter({ hasText: /Selecione o cliente/ }).click();
  await page.getByRole("option").first().click();
  await dialog.getByLabel("Descrição").fill("Recebível avulso E2E");
  await dialog.getByLabel("Valor").fill("199.9");
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 30);
  await dialog.getByLabel("Vencimento").fill(formatDateInput(vencimento));
  const receivableRespPromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/receivables") && resp.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Salvar recebível" }).click();
  await receivableRespPromise;
  await expect(page.getByText("Recebível cadastrado com sucesso!")).toBeVisible({ timeout: 15_000 });
});
