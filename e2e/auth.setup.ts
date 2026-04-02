import fs from "node:fs";
import path from "node:path";

import { test as setup } from "@playwright/test";

setup.use({ storageState: { cookies: [], origins: [] } });

const authDir = path.join(process.cwd(), "e2e", ".auth");
const authFile = path.join(authDir, "user.json");

setup("autenticar e gravar sessão", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("E-mail").fill("teste@empresa-homologacao.local");
  await page.getByLabel("Senha").fill("123456");
  await page.getByRole("button", { name: /Entrar no sistema/i }).click();
  await page.waitForURL("**/dashboard**");
  fs.mkdirSync(authDir, { recursive: true });
  await page.context().storageState({ path: authFile });
});
