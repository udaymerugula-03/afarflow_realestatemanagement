import { defineConfig } from "@playwright/test";

const baseURL = process.env.FRONTEND_TEST_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    baseURL,
    actionTimeout: 15000,
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: `${process.platform === "win32" ? "npm.cmd" : "npm"} run start -- --host localhost --port ${new URL(baseURL).port || "3000"}`,
    url: `${baseURL}/login`,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
