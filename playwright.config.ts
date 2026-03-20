import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const parsedBaseURL = new URL(baseURL);
const serverHost = process.env.PLAYWRIGHT_HOST ?? parsedBaseURL.hostname;
const defaultServerPort =
  parsedBaseURL.port || (parsedBaseURL.protocol === "https:" ? "443" : "80");
const serverPort = process.env.PLAYWRIGHT_PORT ?? defaultServerPort;
const reuseExistingServer =
  process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === undefined
    ? !process.env.CI
    : process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "true";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Build before starting to avoid stale .next artifacts causing hydration mismatches in E2E.
    command: `npm run build && npm run start -- --hostname ${serverHost} --port ${serverPort}`,
    url: baseURL,
    reuseExistingServer,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_FETCH_MAX_RETRIES: "0",
    },
  },
});
