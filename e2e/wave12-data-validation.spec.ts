import { expect, test, type Page } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  selectTimeRange,
  trackConsoleErrors,
  waitForTimeRangeFilter,
} from "./test-utils";

async function readTradeSymbols(page: Page): Promise<string[]> {
  const rows = page.locator("table[aria-label='Trades table'] tbody tr");
  const count = await rows.count();
  const symbols: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const symbol = (await rows.nth(index).locator("td").first().textContent())?.trim();
    if (symbol) {
      symbols.push(symbol);
    }
  }

  return symbols;
}

async function readAllocationTotal(page: Page): Promise<number> {
  const allocationTexts = await page
    .locator("table[aria-label='Strategy allocations table'] tbody tr td:nth-child(3)")
    .allTextContents();

  return allocationTexts.reduce((sum, text) => {
    const parsed = Number.parseFloat(text.replace("%", "").trim());
    return Number.isFinite(parsed) ? sum + parsed : sum;
  }, 0);
}

test.describe("Dashboard data format", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, {
      ...defaultApiResponses,
      "/api/portfolio/state": {
        data: {
          last_updated: "2026-01-15T12:00:00Z",
          total_balance: 12345.67,
          total_equity: 12345.67,
          daily_pnl: -23.45,
          daily_pnl_pct: -0.19,
          strategies: {},
        },
      },
    });
  });

  test("renders formatted balance and PnL values from portfolio data", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");

    await expect(page.getByText("Total Balance")).toBeVisible();
    await expect(page.getByText("Daily PnL")).toBeVisible();
    await expect(page.getByText("$12,345.67")).toBeVisible();
    await expect(page.getByText("-$23.45")).toBeVisible();
    await expect(page.getByText("(-0.19%)")).toBeVisible();
    await expect(page.getByText("NORMAL").first()).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders activity snapshot values from system stats", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");

    await expect(page.getByTestId("stats-recent-trades")).toHaveText("12");
    await expect(page.getByTestId("stats-recent-signals")).toHaveText("34");
    await expect(page.getByTestId("stats-mdse-events")).toHaveText("5");

    expectNoConsoleErrors(errors);
  });
});

test.describe("Trades data validation", () => {
  test("renders trades in reverse-chronological order", async ({ page }) => {
    await installApiMocks(page, {
      ...defaultApiResponses,
      "/api/trades": {
        trades: [
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
            execution_mode: "paper",
          },
          {
            id: 2,
            symbol: "ETH/USDT",
            side: "SELL",
            entry_price: 3200,
            exit_price: 3100,
            quantity: 1,
            pnl: 100,
            pnl_pct: 3.1,
            fees: 1,
            entry_time: "2026-01-02T00:00:00Z",
            exit_time: "2026-01-02T02:00:00Z",
            exit_reason: "tp",
            strategy: "mean_reversion",
            cycle_id: 2,
            created_at: "2026-01-02",
            execution_mode: "paper",
          },
          {
            id: 3,
            symbol: "SOL/USDT",
            side: "BUY",
            entry_price: 200,
            exit_price: null,
            quantity: 5,
            pnl: null,
            pnl_pct: null,
            fees: 0.5,
            entry_time: "2025-12-31T23:00:00Z",
            exit_time: null,
            exit_reason: null,
            strategy: "breakout",
            cycle_id: 3,
            created_at: "2025-12-31",
            execution_mode: "paper",
          },
        ],
        total: 3,
        offset: 0,
        limit: 50,
      },
    });
    const errors = trackConsoleErrors(page);

    await page.goto("/trades");
    await expect(page.getByRole("table", { name: "Trades table" })).toBeVisible();

    await expect
      .poll(() => readTradeSymbols(page))
      .toEqual(["ETH/USDT", "BTC/USDT", "SOL/USDT"]);

    expectNoConsoleErrors(errors);
  });

  test("shows pagination controls when total > page size", async ({ page }) => {
    const manyTrades = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      symbol: "BTC/USDT",
      side: i % 2 === 0 ? "BUY" : "SELL",
      entry_price: 100000 + i * 10,
      exit_price: 100050 + i * 10,
      quantity: 0.1,
      pnl: (i % 2 === 0 ? 1 : -1) * (5 + i),
      pnl_pct: 0.05,
      fees: 0.5,
      entry_time: `2026-01-${String(Math.floor(i / 2) + 1).padStart(2, "0")}T00:00:00Z`,
      exit_time: `2026-01-${String(Math.floor(i / 2) + 1).padStart(2, "0")}T01:00:00Z`,
      exit_reason: "tp",
      strategy: "trend",
      cycle_id: 1,
      created_at: "2026-01-01",
      execution_mode: "paper",
    }));

    await installApiMocks(page, {
      ...defaultApiResponses,
      "/api/trades": {
        trades: manyTrades,
        total: 75,
        offset: 0,
        limit: 50,
      },
    });
    const errors = trackConsoleErrors(page);

    await page.goto("/trades");
    await expect(page.getByText("75 trades")).toBeVisible();

    const prevBtn = page.getByRole("button", { name: "Prev" });
    const nextBtn = page.getByRole("button", { name: "Next" });
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();
    await expect(page.getByText("1-50 / 75")).toBeVisible();

    await nextBtn.click();
    await expect(page.getByText("51-75 / 75")).toBeVisible();
    await expect(prevBtn).toBeEnabled();

    expectNoConsoleErrors(errors);
  });

  test("detail panel shows trade data on row click", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/trades");
    // Click the trade row
    await page.getByRole("row", { name: /BTC\/USDT/ }).click();

    const dialog = page.getByRole("dialog", { name: "Trade Details" });
    await expect(dialog).toBeVisible();
    // Verify data in detail panel
    await expect(dialog.getByText("#1")).toBeVisible();
    await expect(dialog.getByText("BTC/USDT")).toBeVisible();
    await expect(dialog.getByText("BUY")).toBeVisible();
    await expect(dialog.getByText("100,000")).toBeVisible();
    await expect(dialog.getByText("100,500")).toBeVisible();
    await expect(dialog.getByText("Paper")).toBeVisible();
    await expect(dialog.getByText("1h 0m")).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});

test.describe("Portfolio data validation", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, {
      ...defaultApiResponses,
      "/api/portfolio/state": {
        data: {
          last_updated: "2026-01-15T12:00:00Z",
          total_equity: 10000,
          strategies: {
            btc_mom: {
              symbol: "BTC/USDT",
              strategy: "btc_momentum",
              allocation_pct: 41.2,
              equity: 4120,
              initial_equity: 4000,
            },
            sol_fr: {
              symbol: "SOL/USDT",
              strategy: "sol_fr_reversal",
              allocation_pct: 23.5,
              equity: 2350,
              initial_equity: 2300,
            },
            xrp_mom: {
              symbol: "XRP/USDT",
              strategy: "xrp_momentum",
              allocation_pct: 17.65,
              equity: 1765,
              initial_equity: 1700,
            },
            hype_mom: {
              symbol: "HYPE/USDT",
              strategy: "hype_momentum",
              allocation_pct: 17.65,
              equity: 1765,
              initial_equity: 1700,
            },
          },
        },
      },
    });
  });

  test("renders allocation chart and strategy rows", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/portfolio");

    await expect(page.getByText("Strategy Allocation", { exact: true })).toBeVisible();
    await expect(page.getByTestId("strategy-allocation-pie")).toBeVisible();
    await expect(page.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "SOL/USDT" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "XRP/USDT" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "HYPE/USDT" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("displays allocation percentages that sum near 100%", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/portfolio");
    await expect(
      page.getByRole("table", { name: "Strategy allocations table" })
    ).toBeVisible();

    const total = await readAllocationTotal(page);
    expect(total).toBeGreaterThan(99.8);
    expect(total).toBeLessThan(100.2);

    expectNoConsoleErrors(errors);
  });
});

test.describe("Performance data validation", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders summary cards and equity curve data", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/performance");

    await expect(page.getByText("Total PnL")).toBeVisible();
    await expect(page.getByText("Win Rate")).toBeVisible();
    await expect(page.getByText("+50.00")).toBeVisible();
    await expect(page.getByText("100.0%")).toBeVisible();
    await expect(page.getByText("2.00")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Equity Curve" })).toBeVisible();
    await expect(page.getByTestId("equity-curve-chart")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("time range filter changes URL and persists", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/performance");
    await waitForTimeRangeFilter(page);

    await selectTimeRange(page, "30d");
    await expect(page).toHaveURL(/range=30d/);
    await expect(page.getByTestId("equity-curve-chart")).toBeVisible();

    await selectTimeRange(page, "All");
    await expect(page).toHaveURL(/range=all/);
    await expect(page.getByTestId("equity-curve-chart")).toBeVisible();

    await selectTimeRange(page, "7d");
    await expect(page).not.toHaveURL(/range=/);

    expectNoConsoleErrors(errors);
  });
});
