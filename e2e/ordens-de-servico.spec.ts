import { expect, test } from "@playwright/test";

async function ensureUnidadeSelecionada(page, expectedUrl: RegExp) {
  if (!page.url().includes("/selecionar-unidade")) {
    // Pode haver redirect assíncrono para seleção de unidade (quando existem múltiplas unidades e activeUnitId está vazio).
    await page.waitForURL(/\/selecionar-unidade(\?|$)/, { timeout: 2000 }).catch(() => {});
  }

  if (page.url().includes("/selecionar-unidade")) {
    await Promise.all([
      page.waitForURL(expectedUrl, { timeout: 30_000, waitUntil: "domcontentloaded" }),
      page.getByRole("button", { name: "Unidade Principal" }).click(),
    ]);
  }
}

test("listagem de OS carrega", async ({ page }) => {
  await page.goto("/ordens-de-servico");
  await ensureUnidadeSelecionada(page, /\/ordens-de-servico(\?|$)/);
  await expect(page.getByRole("heading", { name: "Ordens de Servico" })).toBeVisible();
  await expect(page.getByPlaceholder("Buscar por numero, cliente ou placa")).toBeVisible();
});

test('botão "Nova OS" navega para /ordens-de-servico/nova', async ({ page }) => {
  await page.goto("/ordens-de-servico");
  await ensureUnidadeSelecionada(page, /\/ordens-de-servico(\?|$)/);
  await page.getByRole("link", { name: /Nova OS/i }).click();
  await page.waitForURL(/\/ordens-de-servico\/nova/, { timeout: 15_000, waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/ordens-de-servico\/nova(\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Nova Ordem de Serviço" })).toBeVisible();
});

test("criação de OS avulsa com serviço manual e Pix conclui com toast e volta à listagem", async ({ page }) => {
  await page.goto("/ordens-de-servico/nova?standalone=1");
  await ensureUnidadeSelecionada(page, /\/ordens-de-servico\/nova(\?|$)/);
  if (!page.url().includes("standalone=1")) {
    await page.goto("/ordens-de-servico/nova?standalone=1");
  }
  await page.getByLabel("Cliente avulso").fill("Cliente avulso E2E");
  await expect(page.getByLabel("Forma de pagamento")).toHaveValue("Pix");
  await page.getByPlaceholder("Serviço 1").fill("Serviço manual E2E");
  const valorServico = page.locator("input[inputmode=\"decimal\"]").first();
  await valorServico.click();
  await valorServico.press("Control+a");
  await valorServico.type("15000");
  const createRespPromise = page.waitForResponse(
    (resp) => resp.url().includes("/api/service-orders") && resp.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Abrir OS" }).click();
  const createResp = await createRespPromise;
  const createBodyText = await createResp.text();
  console.log("[e2e] /api/service-orders status=", createResp.status(), "body=", createBodyText.slice(0, 500));
  await expect(page.getByText("OS criada com sucesso!")).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/ordens-de-servico$/);
});
