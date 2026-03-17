import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Performance page remaining coverage", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders equity curve chart and market snapshot values", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");

    await expect(
      page.getByRole("heading", { level: 1, name: "Performance" })
    ).toBeVisible();

    const chart = page.getByTestId("equity-curve-chart");
    await expect(chart).toBeVisible();
    await expect(chart.locator("svg").first()).toBeVisible();

    const snapshotsTable = page.getByRole("table", {
      name: "Market snapshots table",
    });
    await expect(snapshotsTable).toBeVisible();
    await expect(snapshotsTable.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();
    await expect(snapshotsTable.getByRole("cell", { name: "50.0" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("opens and closes execution detail panel for selected row", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");

    await page.getByRole("row", { name: /#1/ }).click();

    const dialog = page.getByRole("dialog", {
      name: "Execution Quality Details",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Trade ID")).toBeVisible();
    await expect(dialog.getByText("#1")).toBeVisible();
    await expect(dialog.getByText("Slippage %")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    expectNoConsoleErrors(errors);
  });

  test("renders summary metrics and weekly chart aggregation for a multi-day performance range", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      const { pathname } = new URL(route.request().url());

      const payload =
        pathname === "/api/performance/summary"
          ? {
              total_trades: 7,
              winning_trades: 5,
              losing_trades: 2,
              win_rate: 5 / 7,
              total_pnl: 450,
              profit_factor: 2.4,
              avg_slippage: 0.015,
              initial_balance: 10000,
            }
          : pathname === "/api/equity-curve" || pathname === "/api/performance/equity-curve"
            ? {
                data: [
                  { date: "2026-01-01", balance: 10050, daily_pnl: 50, cumulative_pnl: 50 },
                  { date: "2026-01-02", balance: 10110, daily_pnl: 60, cumulative_pnl: 110 },
                  { date: "2026-01-03", balance: 10180, daily_pnl: 70, cumulative_pnl: 180 },
                  { date: "2026-01-06", balance: 10220, daily_pnl: 40, cumulative_pnl: 220 },
                  { date: "2026-01-07", balance: 10310, daily_pnl: 90, cumulative_pnl: 310 },
                  { date: "2026-01-08", balance: 10380, daily_pnl: 70, cumulative_pnl: 380 },
                  { date: "2026-01-10", balance: 10450, daily_pnl: 70, cumulative_pnl: 450 },
                ],
                total_days: 7,
                start_date: "2026-01-01",
                end_date: "2026-01-10",
                initial_balance: 10000,
              }
            : pathname === "/api/trades/by-strategy"
              ? [
                  {
                    date: "2026-01-01",
                    strategy: "trend_following",
                    trade_count: 2,
                    daily_pnl: 50,
                  },
                  {
                    date: "2026-01-02",
                    strategy: "mean_reversion",
                    trade_count: 1,
                    daily_pnl: 20,
                  },
                  {
                    date: "2026-01-08",
                    strategy: "trend_following",
                    trade_count: 2,
                    daily_pnl: 70,
                  },
                ]
              : pathname in defaultApiResponses
                ? defaultApiResponses[pathname as keyof typeof defaultApiResponses]
                : {};

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });

    await page.goto("/performance");

    await expect(page.getByText("Total PnL")).toBeVisible();
    await expect(page.getByText("+450.00")).toBeVisible();
    await expect(page.getByText("71.4%")).toBeVisible();
    await expect(page.getByText("2.40")).toBeVisible();
    await expect(page.getByText("0.015%")).toBeVisible();
    await expect(page.getByText("(4.50%)")).toBeVisible();

    const cumulativeChart = page.getByTestId("cumulative-pnl-chart");
    await expect(cumulativeChart).toBeVisible();
    const areaPath = cumulativeChart.locator(".recharts-area-area").first();
    const dailyPath = await areaPath.getAttribute("d");

    await page.getByRole("button", { name: "Weekly" }).click();
    await expect(page.getByRole("button", { name: "Weekly" })).toHaveClass(/bg-zinc-700/);
    await expect
      .poll(async () => (await areaPath.getAttribute("d")) !== dailyPath)
      .toBe(true);

    expectNoConsoleErrors(errors);
  });

  test("remains usable on a mobile viewport", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/performance");

    await expect(
      page.getByRole("heading", { level: 1, name: "Performance" })
    ).toBeVisible();
    await expect(page.getByText("Total PnL")).toBeVisible();
    await expect(page.getByTestId("equity-curve-chart")).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Execution quality table" })
    ).toBeVisible();

    await page.getByRole("row", { name: /#1/ }).click();
    const dialog = page.getByRole("dialog", {
      name: "Execution Quality Details",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Trade ID")).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
