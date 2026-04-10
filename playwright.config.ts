import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);

/** No CI o GitHub Actions define DATABASE_URL (Postgres do service). Local: use .env.test via dotenv-cli. */
const webServerEnv: Record<string, string> = {
  NODE_ENV: "test",
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "test-secret-aparecida-erp-32chars!!",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  DISABLE_RATE_LIMIT: process.env.DISABLE_RATE_LIMIT ?? "true",
};
if (process.env.DATABASE_URL) {
  webServerEnv.DATABASE_URL = process.env.DATABASE_URL;
  webServerEnv.DIRECT_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    storageState: "e2e/.auth/user.json",
    trace: "on-first-retry",
  },
  webServer: {
    command: isCi ? "npx next dev -p 3000" : "npx dotenv -e .env.test -- next dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    env: webServerEnv,
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
