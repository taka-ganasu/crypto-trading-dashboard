import { expect, test, type Page, type ViewportSize } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const mobileViewport: ViewportSize = { width: 375, height: 667 };
const tabletViewport: ViewportSize = { width: 768, height: 1024 };

const majorPageTargets = [
  { path: "/", heading: "Dashboard" },
  { path: "/trades", heading: "Trade History" },
  { path: "/signals", heading: "Signals" },
  { path: "/portfolio", heading: "Portfolio" },
  { path: "/performance", heading: "Performance" },
  { path: "/analysis", heading: "Analysis" },
  { path: "/strategies", heading: "Strategies" },
  { path: "/circuit-breaker", heading: "Circuit Breaker" },
  { path: "/system", heading: "System" },
] as const;

function buildTrade(
  id: number,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id,
    symbol: `COIN${String(id).padStart(2, "0")}/USDT`,
    side: id % 2 === 0 ? "SELL" : "BUY",
    entry_price: 10_000 + id * 100,
    exit_price: 10_100 + id * 100,
    quantity: 0.1,
    pnl: id * 10,
    pnl_pct: id,
    fees: 1,
    entry_time: `2026-01-${String(((id - 1) % 28) + 1).padStart(2, "0")}T00:00:00Z`,
    exit_time: `2026-01-${String(((id - 1) % 28) + 1).padStart(2, "0")}T01:00:00Z`,
    exit_reason: "tp",
    strategy: "trend",
    cycle_id: id,
    created_at: `2026-01-${String(((id - 1) % 28) + 1).padStart(2, "0")}`,
    execution_mode: "paper",
    ...overrides,
  };
}

function buildAnalysisCycle(id: number): Record<string, unknown> {
  const start = new Date(Date.UTC(2026, 0, 1, 0, id - 1));
  const end = new Date(start.getTime() + 5 * 60 * 1000);
  return {
    id,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    symbols_processed: "[\"BTC/USDT\"]",
    signals_generated: (id % 4) + 1,
    trades_executed: id % 3,
    errors: null,
    duration_seconds: 300,
    regime_info: JSON.stringify({
      regime: id % 2 === 0 ? "trending" : "ranging",
      avg_confidence: 50 + id,
    }),
    created_at: end.toISOString(),
  };
}

function formatLocalDateTime(ts: string): string {
  const date = new Date(ts);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join(" ");
}

async function installApiMocksWithOverrides(
  page: Page,
  overrides: Record<string, unknown>
): Promise<void> {
  await installApiMocks(page, {
    ...defaultApiResponses,
    ...overrides,
  });
}

async function expectMajorPagesVisible(
  page: Page,
  viewport: ViewportSize
): Promise<void> {
  await page.setViewportSize(viewport);
  for (const target of majorPageTargets) {
    await page.goto(target.path);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: target.heading })
    ).toBeVisible();
  }
}

test("mobile viewport renders the major dashboard pages", async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
  const errors = trackConsoleErrors(page);

  await page.setViewportSize(mobileViewport);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Open navigation menu" })
  ).toBeVisible();

  await expectMajorPagesVisible(page, mobileViewport);

  expectNoConsoleErrors(errors);
});

test("tablet viewport renders the major dashboard pages", async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
  const errors = trackConsoleErrors(page);

  await page.setViewportSize(tabletViewport);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open navigation menu" })
  ).toBeHidden();

  await expectMajorPagesVisible(page, tabletViewport);

  expectNoConsoleErrors(errors);
});

test("formats currency, percentages, and timestamps consistently", async ({
  page,
}) => {
  await installApiMocksWithOverrides(page, {
    "/api/portfolio/state": {
      data: {
        total_balance: 123_456.78,
        daily_pnl: 1_234.5,
        daily_pnl_pct: 1.23,
      },
    },
    "/api/trades": {
      trades: [
        buildTrade(1, {
          symbol: "BTC/USDT",
          entry_price: 12_345.678,
          exit_price: 12_987.654,
          pnl: 641.976,
          pnl_pct: 5.2,
          entry_time: "2026-01-15T00:30:00Z",
          exit_time: "2026-01-15T02:45:00Z",
          execution_mode: "live",
        }),
      ],
      total: 1,
      offset: 0,
      limit: 50,
    },
    "/api/performance/by-strategy": [
      {
        strategy: "trend_following",
        trade_count: 12,
        win_rate: 0.612,
        profit_factor: 1.87,
        sharpe: 1.11,
        avg_pnl: 45.6,
        max_dd: 89.1,
      },
    ],
  });
  const errors = trackConsoleErrors(page);

  await page.goto("/");
  await expect(page.getByText("$123,456.78")).toBeVisible();
  await expect(page.getByText("+$1,234.50")).toBeVisible();
  await expect(page.getByText("(+1.23%)")).toBeVisible();

  await page.goto("/trades");
  const tradeRow = page.getByRole("row", { name: /BTC\/USDT/ });
  await expect(tradeRow).toContainText("12,345.68");
  await expect(tradeRow).toContainText("12,987.65");
  await expect(tradeRow).toContainText("+641.98");
  await expect(tradeRow).toContainText(
    formatLocalDateTime("2026-01-15T00:30:00Z")
  );
  await expect(tradeRow).toContainText(
    formatLocalDateTime("2026-01-15T02:45:00Z")
  );

  await page.goto("/strategies");
  await expect(
    page
      .locator("table[aria-label='Strategy comparison table'] tbody tr")
      .first()
  ).toContainText("61.2%");

  expectNoConsoleErrors(errors);
});

test("supports strategy sorting and analysis pagination with validated data", async ({
  page,
}) => {
  await installApiMocksWithOverrides(page, {
    "/api/performance/by-strategy": [
      {
        strategy: "slow_strategy",
        trade_count: 8,
        win_rate: 0.25,
        profit_factor: 0.95,
        sharpe: 0.4,
        avg_pnl: -5,
        max_dd: 90,
      },
      {
        strategy: "fast_strategy",
        trade_count: 12,
        win_rate: 0.8,
        profit_factor: 2.1,
        sharpe: 1.4,
        avg_pnl: 30,
        max_dd: 35,
      },
      {
        strategy: "steady_strategy",
        trade_count: 10,
        win_rate: 0.5,
        profit_factor: 1.3,
        sharpe: 0.8,
        avg_pnl: 12,
        max_dd: 50,
      },
    ],
    "/api/cycles": Array.from({ length: 26 }, (_, index) =>
      buildAnalysisCycle(index + 1)
    ),
  });
  const errors = trackConsoleErrors(page);

  await page.goto("/strategies");
  const strategyRows = page.locator(
    "table[aria-label='Strategy comparison table'] tbody tr"
  );
  const winRateSortButton = page.getByRole("button", { name: "Win Rate" });

  await winRateSortButton.click();
  await expect(strategyRows.first()).toContainText("fast_strategy");

  await winRateSortButton.click();
  await expect(strategyRows.first()).toContainText("slow_strategy");

  await page.goto("/analysis");
  const cycleRows = page.locator("table[aria-label='Cycle table'] tbody tr");
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expect(cycleRows.first()).toContainText("#1");

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(cycleRows.first()).toContainText("#26");

  await page.getByRole("button", { name: "Prev" }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await expect(cycleRows.first()).toContainText("#1");

  expectNoConsoleErrors(errors);
});
