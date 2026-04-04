import { expect, test, type Page } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("login com credenciais corretas redireciona para o dashboard", async ({ page }: { page: Page }) => {
  const email = (process.env.TEST_OWNER_EMAIL || "teste@aparecida-test.local").toLowerCase();
  await page.goto("/");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("123456");
  const entrarBtn = page.getByRole("button", { name: /Entrar no sistema/i });
  await expect(entrarBtn).toBeEnabled();
  await entrarBtn.click();
  await page.waitForURL(/\/dashboard(\?|$)/, {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/dashboard(\?|$)/);
});

test("login com senha errada retorna erro de credenciais", async ({ page }: { page: Page }) => {
  const email = (process.env.TEST_OWNER_EMAIL || "teste@aparecida-test.local").toLowerCase();

  const csrfResp = await page.request.get("/api/auth/csrf");
  const { csrfToken } = await csrfResp.json();
  expect(csrfToken).toBeTruthy();

  const loginResp = await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email,
      password: "senha-incorreta",
      redirect: "false",
      json: "true",
      callbackUrl: "http://localhost:3000/",
    },
  });

  const body = await loginResp.json();
  expect(body.url).toContain("error");

  const sessionResp = await page.request.get("/api/auth/session");
  const sessionJson = (await sessionResp.json()) as any;
  expect(sessionJson?.user).toBeFalsy();
});
