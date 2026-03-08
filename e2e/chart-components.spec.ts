import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const chartComponentResponses = {
  ...defaultApiResponses,
  "/api/portfolio/state": {
    data: {
      last_updated: "2026-01-02T00:00:00Z",
      total_equity: 12000,
      strategies: {
        btc_usdt: {
          symbol: "BTC/USDT",
          strategy: "trend",
          allocation_pct: 60,
          equity: 7200,
          initial_equity: 6800,
        },
        eth_usdt: {
          symbol: "ETH/USDT",
          strategy: "mean_revert",
          allocation_pct: 40,
          equity: 4800,
          initial_equity: 5000,
        },
      },
    },
  },
  "/api/equity-curve": {
    data: [
      { date: "2026-01-01", balance: 10120, daily_pnl: 120, cumulative_pnl: 120 },
      { date: "2026-01-02", balance: 10040, daily_pnl: -80, cumulative_pnl: 40 },
      { date: "2026-01-03", balance: 10180, daily_pnl: 140, cumulative_pnl: 180 },
    ],
    total_days: 3,
    start_date: "2026-01-01",
    end_date: "2026-01-03",
  },
  "/api/performance/equity-curve": {
    data: [
      { date: "2026-01-01", balance: 10120, daily_pnl: 120, cumulative_pnl: 120 },
      { date: "2026-01-02", balance: 10040, daily_pnl: -80, cumulative_pnl: 40 },
      { date: "2026-01-03", balance: 10180, daily_pnl: 140, cumulative_pnl: 180 },
    ],
    total_days: 3,
    start_date: "2026-01-01",
    end_date: "2026-01-03",
  },
};

function statusResponses(status: "healthy" | "degraded" | "unhealthy") {
  return {
    ...defaultApiResponses,
    "/api/health": {
      status,
      api_version: "v1.3.0",
      updated_at: "2026-01-02T00:10:00Z",
    },
  };
}

test.describe("Chart components", () => {
  test("DailyPnlChart reflects both positive and negative pnl ranges", async ({ page }) => {
    await installApiMocks(page, chartComponentResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/portfolio");
    const chart = page.getByTestId("daily-pnl-chart");
    await expect(chart).toBeVisible();

    await expect(chart.getByText("$-140").first()).toBeVisible();
    await expect(chart.getByText("$140").first()).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("StrategyAllocationPie renders donut chart segments", async ({ page }) => {
    await installApiMocks(page, chartComponentResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/portfolio");
    const pie = page.getByTestId("strategy-allocation-pie");
    await expect(pie).toBeVisible();

    await expect(page.getByText("BTC/USDT trend")).toBeVisible();
    await expect(page.getByText("ETH/USDT mean_revert")).toBeVisible();

    const segments = pie.locator(
      "svg [fill='#34d399'], svg [fill='#60a5fa'], svg [fill='#f59e0b']"
    );
    expect(await segments.count()).toBeGreaterThan(1);

    expectNoConsoleErrors(errors);
  });
});

const statusCases: Array<{
  status: "healthy" | "degraded" | "unhealthy";
  className: string;
}> = [
  { status: "healthy", className: "text-emerald-300" },
  { status: "degraded", className: "text-yellow-300" },
  { status: "unhealthy", className: "text-red-300" },
];

for (const statusCase of statusCases) {
  test(`SystemStatusWidget shows ${statusCase.status} with expected color class`, async ({
    page,
  }) => {
    await installApiMocks(page, statusResponses(statusCase.status));
    const errors = trackConsoleErrors(page);

    await page.goto("/");

    const widget = page.getByTestId("system-status-widget");
    const value = page.getByTestId("bot-status-value");
    await expect(widget).toBeVisible();
    await expect(value).toHaveText(new RegExp(statusCase.status, "i"));

    const className = (await value.getAttribute("class")) ?? "";
    expect(className).toContain(statusCase.className);

    expectNoConsoleErrors(errors);
  });
}

test("StatsOverviewCards renders three activity cards", async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
  const errors = trackConsoleErrors(page);

  await page.goto("/");

  const cards = page.getByTestId("stats-overview-cards");
  await expect(cards).toBeVisible();
  await expect(cards.getByText("Recent Trades")).toBeVisible();
  await expect(cards.getByText("Recent Signals")).toBeVisible();
  await expect(cards.getByText("MDSE Events")).toBeVisible();
  await expect(page.getByTestId("stats-recent-trades")).toBeVisible();
  await expect(page.getByTestId("stats-recent-signals")).toBeVisible();
  await expect(page.getByTestId("stats-mdse-events")).toBeVisible();

  expectNoConsoleErrors(errors);
});
