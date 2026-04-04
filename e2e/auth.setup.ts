import fs from "node:fs";
import path from "node:path";

import { expect, test as setup } from "@playwright/test";

setup.use({ storageState: { cookies: [], origins: [] } });
setup.setTimeout(90_000);

const authDir = path.join(process.cwd(), "e2e", ".auth");
const authFile = path.join(authDir, "user.json");

setup("autenticar e gravar sessão", async ({ page }) => {
  const csrfResp = await page.request.get("/api/auth/csrf");
  const csrfBody = await csrfResp.json();
  const csrfToken: string = csrfBody.csrfToken ?? "";
  expect(csrfToken, "CSRF token deve estar presente").toBeTruthy();

  const loginResp = await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: "teste@aparecida-test.local",
      password: "123456",
      redirect: "false",
      json: "true",
      callbackUrl: "http://localhost:3000/dashboard",
    },
  });
  expect(loginResp.ok(), "Login callback deve retornar 200").toBeTruthy();

  const sessionResp = await page.request.get("/api/auth/session");
  const sessionJson = (await sessionResp.json()) as { user?: { email?: string } };
  expect(sessionJson?.user?.email, "Sessão deve conter email do usuário").toBeTruthy();

  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, {
    timeout: 30_000,
    waitUntil: "domcontentloaded",
  });

  fs.mkdirSync(authDir, { recursive: true });
  await page.context().storageState({ path: authFile });
});
