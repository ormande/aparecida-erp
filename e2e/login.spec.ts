import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("login com credenciais corretas redireciona para o dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("E-mail").fill("teste@empresa-homologacao.local");
  await page.getByLabel("Senha").fill("123456");
  await page.getByRole("button", { name: /Entrar no sistema/i }).click();
  await page.waitForURL("**/dashboard**");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("login com senha errada exibe mensagem de erro", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("E-mail").fill("teste@empresa-homologacao.local");
  await page.getByLabel("Senha").fill("senha-incorreta");
  await page.getByRole("button", { name: /Entrar no sistema/i }).click();
  await expect(page.getByText("E-mail ou senha inválidos.")).toBeVisible();
});
