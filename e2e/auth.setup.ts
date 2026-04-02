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
  const sessionJson = (await sessionResp.json()) as any;
  expect(sessionJson?.user?.email, "Sessão deve conter email do usuário").toBeTruthy();

  const units: Array<{ id: string; name: string }> = sessionJson?.user?.units ?? [];
  let activeUnitId: string | null =
    sessionJson?.activeUnitId ?? sessionJson?.user?.activeUnitId ?? null;

  if (!activeUnitId && units.length > 0) {
    const target = units.find((u) => u.name === "Unidade Principal") ?? units[0];
    await page.request.post("/api/auth/session", {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ csrfToken, data: { activeUnitId: target.id } }),
    });
    const verifyResp = await page.request.get("/api/auth/session");
    const verifyJson = (await verifyResp.json()) as any;
    activeUnitId = verifyJson?.activeUnitId ?? verifyJson?.user?.activeUnitId ?? null;
  }

  expect(activeUnitId, "activeUnitId deve estar definido na sessão").toBeTruthy();

  await page.goto("/dashboard");
  await page.waitForURL(/\/(dashboard|selecionar-unidade)/, {
    timeout: 30_000,
    waitUntil: "domcontentloaded",
  });

  fs.mkdirSync(authDir, { recursive: true });
  await page.context().storageState({ path: authFile });
});
