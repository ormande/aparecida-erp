import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    storageState: "e2e/.auth/user.json",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx dotenv -e .env.test -- next dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    // Força o secret de teste mesmo que o Next.js carregue .env automaticamente.
    env: {
      NEXTAUTH_SECRET: "test-secret-aparecida-erp-32chars!!",
      NEXTAUTH_URL: "http://localhost:3000",
      DATABASE_URL:
        "postgresql://postgres:QloKyAqGjmNxhvgtpAJTucdektPkqtQo@interchange.proxy.rlwy.net:29864/railway",
      DIRECT_URL:
        "postgresql://postgres:QloKyAqGjmNxhvgtpAJTucdektPkqtQo@interchange.proxy.rlwy.net:29864/railway",
      DISABLE_RATE_LIMIT: "true",
    },
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
});
