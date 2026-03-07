import { expect, test, type Page } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  trackConsoleErrors,
} from "./test-utils";

type ApiResponseMap = Record<string, unknown>;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function installApiMocks(
  page: Page,
  responses: ApiResponseMap = defaultApiResponses
): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    const payload = pathname in responses ? responses[pathname] : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}

async function installDelayedApiMocks(page: Page, delayMs: number): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    await wait(delayMs);
    const payload =
      pathname in defaultApiResponses
        ? defaultApiResponses[pathname as keyof typeof defaultApiResponses]
        : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}

async function installSingleFailure(page: Page, failingPathname: string): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === failingPathname) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "forced error" }),
      });
      return;
    }
    const payload =
      pathname in defaultApiResponses
        ? defaultApiResponses[pathname as keyof typeof defaultApiResponses]
        : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}

test.describe("Dashboard E2E edge cases", () => {
  test("loading state: dashboard shows loading spinner while API is pending", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await installDelayedApiMocks(page, 800);

    await page.goto("/");
    await expect(page.getByText("Loading dashboard...")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("loading state: trades page shows loading spinner while API is pending", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await installDelayedApiMocks(page, 800);

    await page.goto("/trades");
    await expect(page.getByText("Loading trades...")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Trade History" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("loading state: signals page shows loading spinner while API is pending", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await installDelayedApiMocks(page, 800);

    await page.goto("/signals");
    await expect(page.getByText("Loading signals...")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Signals" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("loading state: analysis page shows loading spinner while API is pending", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await installDelayedApiMocks(page, 800);

    await page.goto("/analysis");
    await expect(page.getByText("Loading analysis...")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Analysis" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("error state: dashboard shows warning when one section fails", async ({ page }) => {
    await installSingleFailure(page, "/api/trades");

    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(/Some sections failed to load:/)).toBeVisible();
    await expect(page.getByText(/recent trades/)).toBeVisible();
  });

  test("error state: dashboard retry recovers after initial full failure", async ({ page }) => {
    const failOnce = new Set(["/api/portfolio/state", "/api/cb/state", "/api/trades"]);
    const failedAlready = new Set<string>();

    await page.route("**/api/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      if (failOnce.has(pathname) && !failedAlready.has(pathname)) {
        failedAlready.add(pathname);
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "fail once" }),
        });
        return;
      }
      const payload =
        pathname in defaultApiResponses
          ? defaultApiResponses[pathname as keyof typeof defaultApiResponses]
          : {};
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });

    await page.goto("/");
    await expect(page.getByText("Failed to load dashboard data.")).toBeVisible();

    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent Trades" })).toBeVisible();
  });

  test("error state: portfolio page shows retry UI when state endpoint fails", async ({ page }) => {
    await installSingleFailure(page, "/api/portfolio/state");

    await page.goto("/portfolio");

    await expect(page.getByText(/API error: 500/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByText("Make sure the API server is running on port 8000")).toBeVisible();
  });

  test("warning state: portfolio page keeps rendering when chart section fails", async ({ page }) => {
    await installSingleFailure(page, "/api/performance/equity-curve");

    await page.goto("/portfolio");

    await expect(page.getByText(/Some sections failed to load:/)).toBeVisible();
    await expect(page.getByText(/daily PnL chart/)).toBeVisible();
    await expect(page.getByText("Strategy Allocations")).toBeVisible();
  });

  test("empty data: performance page shows empty table states", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await installApiMocks(page, {
      ...defaultApiResponses,
      "/api/performance/execution-quality": [],
      "/api/performance/market-snapshots": [],
      "/api/performance/equity-curve": {
        data: [],
        total_days: 0,
        start_date: null,
        end_date: null,
      },
    });

    await page.goto("/performance");

    await expect(page.getByText("No execution data")).toBeVisible();
    await expect(page.getByText("No snapshots")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Performance" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("empty data: mdse page shows empty states for all sections", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await installApiMocks(page, {
      ...defaultApiResponses,
      "/api/mdse/scores": [],
      "/api/mdse/summary": {
        total_events: 0,
        validated_events: 0,
        unvalidated_events: 0,
        detectors: [],
      },
      "/api/mdse/events": [],
      "/api/mdse/trades": [],
      "/api/mdse/timeline": { prices: [], events: [] },
    });

    await page.goto("/mdse");

    await expect(page.getByText("No detector data available")).toBeVisible();
    await expect(page.getByText("No events found")).toBeVisible();
    await expect(page.getByText("No MDSE trades found")).toBeVisible();
    await expect(page.getByText("No timeline data available")).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
