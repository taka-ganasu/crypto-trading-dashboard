import { expect, test, type Route } from "@playwright/test";
import {
  defaultApiResponses,
  nullSafeApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

type ApiPayloadMap = Record<string, unknown>;

const apiResponses = defaultApiResponses as ApiPayloadMap;

async function fulfillDefaultApiRoute(route: Route): Promise<void> {
  const { pathname } = new URL(route.request().url());
  const payload = pathname in apiResponses ? apiResponses[pathname] : {};
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

function buildTrade(
  id: number,
  overrides: Partial<{
    symbol: string;
    side: string;
    entry_price: number;
    exit_price: number | null;
    pnl: number | null;
    pnl_pct: number | null;
    quantity: number;
    fees: number | null;
    entry_time: string;
    exit_time: string | null;
    exit_reason: string | null;
    strategy: string;
    execution_mode: string;
  }> = {}
) {
  return {
    id,
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
    ...overrides,
  };
}

// ─── Trades: pagination ──────────────────────────────────────

test.describe("Trades page — pagination", () => {
  test("navigates between pages when more than 50 trades exist", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const requestedOffsets: number[] = [];
    const firstPage = Array.from({ length: 50 }, (_, i) =>
      buildTrade(i + 1, { symbol: `COIN${String(i + 1).padStart(2, "0")}/USDT` })
    );
    const secondPage = [
      buildTrade(51, { symbol: "LAST/USDT" }),
    ];

    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/trades") {
        const offset = Number(url.searchParams.get("offset") ?? "0");
        requestedOffsets.push(offset);
        const trades = offset >= 50 ? secondPage : firstPage;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            trades,
            total: 51,
            offset,
            limit: 50,
          }),
        });
        return;
      }
      await fulfillDefaultApiRoute(route);
    });

    await page.goto("/trades");
    await expect(page.getByText("51 trades")).toBeVisible();
    await expect(page.getByRole("cell", { name: "COIN01/USDT" })).toBeVisible();

    // Navigate to page 2
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("cell", { name: "LAST/USDT" })).toBeVisible();

    // Navigate back
    await page.getByRole("button", { name: "Prev" }).click();
    await expect(page.getByRole("cell", { name: "COIN01/USDT" })).toBeVisible();

    expect(requestedOffsets).toContain(0);
    expect(requestedOffsets).toContain(50);
    expectNoConsoleErrors(errors);
  });
});

// ─── Trades: empty state ─────────────────────────────────────

test.describe("Trades page — empty and error states", () => {
  test("displays empty state message when no trades exist", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await installApiMocks(page, {
      ...defaultApiResponses,
      "/api/trades": { trades: [], total: 0, offset: 0, limit: 50 },
    });

    await page.goto("/trades");
    await expect(page.getByText("No trades found")).toBeVisible();
    await expect(page.getByText("0 trades")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("shows error alert when trades API fails", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/api/trades") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Internal Server Error" }),
        });
        return;
      }
      await fulfillDefaultApiRoute(route);
    });

    await page.goto("/trades");
    await expect(page.getByText(/Data unavailable/)).toBeVisible();

    const relevant = errors.filter(
      (e) => !e.includes("status of 500")
    );
    expectNoConsoleErrors(relevant);
  });

  test("renders open trade with null exit_price and exit_time", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await installApiMocks(page, {
      ...defaultApiResponses,
      "/api/trades": {
        trades: [
          buildTrade(1, {
            symbol: "ETH/USDT",
            exit_price: null,
            exit_time: null,
            pnl: null,
            pnl_pct: null,
          }),
        ],
        total: 1,
        offset: 0,
        limit: 50,
      },
    });

    await page.goto("/trades");
    await expect(page.getByRole("cell", { name: "ETH/USDT" })).toBeVisible();
    // Open trades show "Open" text inside table cells for exit price and exit date
    const table = page.getByRole("table", { name: "Trades table" });
    await expect(table.getByText("Open").first()).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});

// ─── Portfolio: multi-strategy & charts ──────────────────────

test.describe("Portfolio page — strategies and charts", () => {
  const multiStrategyState = {
    "/api/portfolio/state": {
      data: {
        last_updated: "2026-01-03T12:00:00Z",
        total_equity: 20000,
        strategies: {
          btc_trend: {
            symbol: "BTC/USDT",
            strategy: "trend_following",
            allocation_pct: 60,
            equity: 12000,
            initial_equity: 10000,
          },
          sol_carry: {
            symbol: "SOL/USDT",
            strategy: "carry_trade",
            allocation_pct: 40,
            equity: 8000,
            initial_equity: 7500,
          },
        },
      },
    },
  };

  test("renders multiple strategies in allocation table", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await installApiMocks(page, {
      ...defaultApiResponses,
      ...multiStrategyState,
    });

    await page.goto("/portfolio");
    await expect(
      page.getByRole("heading", { level: 1, name: "Portfolio" })
    ).toBeVisible();

    const table = page.getByRole("table", {
      name: "Strategy allocations table",
    });
    await expect(table).toBeVisible();
    await expect(table.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();
    await expect(table.getByRole("cell", { name: "SOL/USDT" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("shows daily PnL chart section with data", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await installApiMocks(page, {
      ...defaultApiResponses,
      ...multiStrategyState,
    });

    await page.goto("/portfolio");
    await expect(page.getByText("Daily PnL")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders with empty portfolio state gracefully", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await installApiMocks(page, {
      ...defaultApiResponses,
      "/api/portfolio/state": { data: {} },
      "/api/equity-curve": { data: [], total_days: 0 },
      "/api/performance/equity-curve": { data: [], total_days: 0 },
    });

    await page.goto("/portfolio");
    await expect(
      page.getByRole("heading", { level: 1, name: "Portfolio" })
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});

// ─── Signals: detail panel & error ───────────────────────────

test.describe("Signals page — detail panel and error", () => {
  test("clicking a signal row opens detail panel with signal info", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await installApiMocks(page, {
      ...defaultApiResponses,
      "/api/signals": {
        signals: [
          {
            id: 42,
            timestamp: "2026-01-15T14:30:00Z",
            symbol: "SOL/USDT",
            action: "buy",
            score: 0.92,
            confidence: 88,
            executed: 1,
            skip_reason: null,
            strategy_type: "carry_trade",
            cycle_id: 5,
            created_at: "2026-01-15",
          },
        ],
        total: 1,
        offset: 0,
        limit: 25,
      },
    });

    await page.goto("/signals");
    await expect(page.getByRole("cell", { name: "SOL/USDT" })).toBeVisible();

    // Click the row to open the detail panel
    await page.getByRole("row", { name: /SOL\/USDT/ }).click();
    const dialog = page.getByRole("dialog", { name: "Signal Details" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("SOL/USDT")).toBeVisible();
    await expect(dialog.getByText("carry_trade")).toBeVisible();

    // Close panel
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    expectNoConsoleErrors(errors);
  });

  test("shows error alert when signals API fails", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/api/signals") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Service Unavailable" }),
        });
        return;
      }
      await fulfillDefaultApiRoute(route);
    });

    await page.goto("/signals");
    await expect(page.getByText(/Data unavailable/)).toBeVisible();

    const relevant = errors.filter(
      (e) => !e.includes("status of 503")
    );
    expectNoConsoleErrors(relevant);
  });

  test("displays empty signals state", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await installApiMocks(page, {
      ...defaultApiResponses,
      "/api/signals": { signals: [], total: 0, offset: 0, limit: 25 },
    });

    await page.goto("/signals");
    await expect(page.getByText("0 signals")).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});

// ─── Cross-page: navigation from Dashboard to subpages ──────

test.describe("Dashboard to subpage navigation", () => {
  test("navigates from dashboard to trades via sidebar link", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await installApiMocks(page, defaultApiResponses);

    await page.goto("/");
    await page.getByRole("link", { name: /Trades/i }).click();
    await expect(page).toHaveURL(/\/trades/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Trade History" })
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("navigates from dashboard to portfolio via sidebar link", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    await installApiMocks(page, defaultApiResponses);

    await page.goto("/");
    await page.getByRole("link", { name: /Portfolio/i }).click();
    await expect(page).toHaveURL(/\/portfolio/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Portfolio" })
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
