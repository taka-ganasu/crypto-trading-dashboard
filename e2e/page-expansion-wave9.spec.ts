import { expect, test, type Page } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

async function installApiMocksWithOverrides(
  page: Page,
  overrides: Record<string, unknown>
): Promise<void> {
  await installApiMocks(page, {
    ...defaultApiResponses,
    ...overrides,
  });
}

async function installApiMocksWithFailure(
  page: Page,
  failingPathname: string
): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === failingPathname) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "forced failure" }),
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

test.describe("Wave9 expansion - trades page", () => {
  test("renders trade history table with expected headers", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/trades");

    await expect(page.getByRole("heading", { level: 1, name: "Trade History" })).toBeVisible();
    await expect(page.getByText("1 trades")).toBeVisible();
    const table = page.getByRole("table", { name: "Trades table" });
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Symbol" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "PnL" })).toBeVisible();
    await expect(table.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("clicking a trade row opens trade details panel", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/trades");
    await page.getByRole("row", { name: /BTC\/USDT/ }).click();

    await expect(page.getByRole("dialog", { name: "Trade Details" })).toBeVisible();
    await expect(page.getByText("Trade ID")).toBeVisible();
    await expect(page.getByText("#1")).toBeVisible();
    await expect(page.getByText("Duration")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("tradeId query highlights the matching trade row", async ({ page }) => {
    await installApiMocksWithOverrides(page, {
      "/api/trades": [
        {
          id: 1,
          symbol: "BTC/USDT",
          side: "BUY",
          entry_price: 100000,
          exit_price: 100500,
          quantity: 0.1,
          pnl: 50,
          pnl_pct: 0.5,
          fees: 1,
          entry_time: "2026-01-01T00:00:00Z",
          exit_time: "2026-01-01T01:00:00Z",
          exit_reason: "tp",
          strategy: "trend",
          cycle_id: 1,
          created_at: "2026-01-01",
        },
        {
          id: 2,
          symbol: "ETH/USDT",
          side: "SELL",
          entry_price: 3200,
          exit_price: 3100,
          quantity: 1.0,
          pnl: 100,
          pnl_pct: 3.1,
          fees: 1,
          entry_time: "2026-01-02T00:00:00Z",
          exit_time: "2026-01-02T02:00:00Z",
          exit_reason: "tp",
          strategy: "mean_reversion",
          cycle_id: 2,
          created_at: "2026-01-02",
        },
      ],
    });
    const errors = trackConsoleErrors(page);

    await page.goto("/trades?tradeId=2");

    const highlightedRow = page
      .locator("table[aria-label='Trades table'] tbody tr")
      .filter({ hasText: "ETH/USDT" })
      .first();
    await expect(highlightedRow).toHaveClass(/bg-zinc-800\/60/);

    expectNoConsoleErrors(errors);
  });

  test("renders API error message when trades endpoint fails", async ({ page }) => {
    await installApiMocksWithFailure(page, "/api/trades");

    await page.goto("/trades");

    await expect(page.getByText("Error: API error: 500")).toBeVisible();
  });
});

test.describe("Wave9 expansion - signals page", () => {
  test("renders stats summary with multiple signal rows", async ({ page }) => {
    await installApiMocksWithOverrides(page, {
      "/api/signals": [
        {
          id: 1,
          timestamp: "2026-01-01T00:00:00Z",
          symbol: "BTC/USDT",
          action: "buy",
          score: 0.8,
          confidence: 80,
          executed: 1,
          skip_reason: null,
          strategy_type: "trend",
          cycle_id: 1,
          created_at: "2026-01-01",
        },
        {
          id: 2,
          timestamp: "2026-01-01T00:10:00Z",
          symbol: "ETH/USDT",
          action: "sell",
          score: 0.6,
          confidence: 40,
          executed: 0,
          skip_reason: "risk_filter",
          strategy_type: "mean_reversion",
          cycle_id: 1,
          created_at: "2026-01-01",
        },
      ],
    });
    const errors = trackConsoleErrors(page);

    await page.goto("/signals");

    await expect(page.getByText("2 signals")).toBeVisible();
    await expect(page.getByText("Execution Rate")).toBeVisible();
    await expect(page.getByText("50.0%")).toBeVisible();
    await expect(page.getByText("Avg Confidence")).toBeVisible();
    await expect(page.getByText("60.0%")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("clicking a signal row opens signal details panel", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/signals");
    await page.getByRole("row", { name: /BTC\/USDT/ }).click();

    await expect(page.getByRole("dialog", { name: "Signal Details" })).toBeVisible();
    await expect(page.getByText("Signal ID")).toBeVisible();
    await expect(page.getByText("#1")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders API error message when signals endpoint fails", async ({ page }) => {
    await installApiMocksWithFailure(page, "/api/signals");

    await page.goto("/signals");

    await expect(page.getByText("Error: API error: 500")).toBeVisible();
  });
});

test.describe("Wave9 expansion - strategies sorting and responsive", () => {
  test("sorts strategy table by win rate descending", async ({ page }) => {
    await installApiMocksWithOverrides(page, {
      "/api/performance/by-strategy": [
        {
          strategy: "slow_strategy",
          trade_count: 5,
          win_rate: 0.25,
          profit_factor: 1.1,
          sharpe: 0.4,
          avg_pnl: 2,
          max_dd: 80,
        },
        {
          strategy: "fast_strategy",
          trade_count: 11,
          win_rate: 0.8,
          profit_factor: 2.0,
          sharpe: 1.4,
          avg_pnl: 30,
          max_dd: 40,
        },
        {
          strategy: "null_strategy",
          trade_count: 2,
          win_rate: null,
          profit_factor: null,
          sharpe: null,
          avg_pnl: null,
          max_dd: null,
        },
      ],
    });
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    await page
      .locator("table[aria-label='Strategy comparison table'] button[aria-label='Win Rate']")
      .click();

    const rows = page.locator("table[aria-label='Strategy comparison table'] tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(rows.first().locator("td").first()).toHaveText("fast_strategy");
    await expect(rows.last().locator("td").first()).toHaveText("null_strategy");

    expectNoConsoleErrors(errors);
  });

  test("sorts strategy table by win rate ascending on second click", async ({ page }) => {
    await installApiMocksWithOverrides(page, {
      "/api/performance/by-strategy": [
        {
          strategy: "slow_strategy",
          trade_count: 5,
          win_rate: 0.25,
          profit_factor: 1.1,
          sharpe: 0.4,
          avg_pnl: 2,
          max_dd: 80,
        },
        {
          strategy: "fast_strategy",
          trade_count: 11,
          win_rate: 0.8,
          profit_factor: 2.0,
          sharpe: 1.4,
          avg_pnl: 30,
          max_dd: 40,
        },
        {
          strategy: "null_strategy",
          trade_count: 2,
          win_rate: null,
          profit_factor: null,
          sharpe: null,
          avg_pnl: null,
          max_dd: null,
        },
      ],
    });
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    const sortButton = page.locator(
      "table[aria-label='Strategy comparison table'] button[aria-label='Win Rate']"
    );
    await sortButton.click();
    await sortButton.click();

    const rows = page.locator("table[aria-label='Strategy comparison table'] tbody tr");
    await expect(rows.first().locator("td").first()).toHaveText("slow_strategy");
    await expect(rows.last().locator("td").first()).toHaveText("null_strategy");

    expectNoConsoleErrors(errors);
  });

  test("mobile viewport can open strategy details from cards", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/strategies");

    await page.getByRole("button", { name: /trend_following/ }).click();
    await expect(page.getByRole("dialog", { name: "Strategy Details" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
