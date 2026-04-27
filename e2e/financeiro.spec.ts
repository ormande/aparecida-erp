import { expect, test, type Page } from "@playwright/test";

function pad2(n: number) {
  return String(n).padStart(2, "0");
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
  const customerName = `Cliente Recebível E2E ${Date.now()}`;
  const createCustomerResponse = await page.request.post("/api/customers", {
    data: {
      tipo: "pf",
      nomeCompleto: customerName,
      cpf: "",
      dataNascimento: "",
      nomeFantasia: "",
      razaoSocial: "",
      cnpj: "",
      situacao: "Ativo",
      celular: "11987654321",
      whatsapp: "11987654321",
      email: "",
      observacoes: "",
    },
  });
  expect(createCustomerResponse.ok()).toBeTruthy();

  await page.goto("/financeiro/receber");
  await page.getByRole("button", { name: "Novo recebível" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo recebível avulso" });
  await dialog.getByRole("combobox").filter({ hasText: /Selecione o cliente/ }).click();
  await page.getByRole("option", { name: customerName }).click();
  await dialog.getByLabel("Descrição").fill("Recebível avulso E2E");
  await dialog.getByLabel("Valor").fill("199.9");
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 30);
  await dialog.getByRole("button", { name: /Selecione uma data/i }).click();
  await expect(page.getByRole("grid")).toBeVisible();
  const monthSelect = page.getByLabel("Choose the Month");
  const yearSelect = page.getByLabel("Choose the Year");
  if ((await monthSelect.count()) > 0 && (await yearSelect.count()) > 0) {
    await monthSelect.selectOption({ value: String(vencimento.getMonth()) });
    await yearSelect.selectOption({ value: String(vencimento.getFullYear()) });
  }
  const dataDay = `${pad2(vencimento.getDate())}/${pad2(vencimento.getMonth() + 1)}/${vencimento.getFullYear()}`;
  await page
    .getByRole("gridcell")
    .filter({ has: page.locator(`button[data-day="${dataDay}"]`) })
    .first()
    .click();
  await expect(page.getByRole("grid")).toBeHidden();
  const receivableRespPromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/receivables") && resp.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "Salvar recebível" }).click();
  await receivableRespPromise;
  await page.waitForTimeout(500);
  await expect(page.getByText("Recebível cadastrado com sucesso!")).toBeVisible({ timeout: 20_000 });
});
