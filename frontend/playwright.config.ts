import { defineConfig } from "@playwright/test";

const baseURL = process.env.FRONTEND_TEST_URL || "https://aqarflow-real-estate.vercel.app";
if (new URL(baseURL).protocol !== "https:") throw new Error("Browser tests require the cloud application's HTTPS URL.");

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
});
