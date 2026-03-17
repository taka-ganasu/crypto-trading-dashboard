import { expect, test, type Route } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

type ApiPayloadMap = Record<string, unknown>;

const apiResponses = defaultApiResponses as ApiPayloadMap;

async function installMergedApiMocks(
  page: Parameters<typeof installApiMocks>[0],
  overrides: Record<string, unknown>
): Promise<void> {
  await installApiMocks(page, {
    ...defaultApiResponses,
    ...overrides,
  });
}

async function fulfillDefaultApiRoute(route: Route): Promise<void> {
  const { pathname } = new URL(route.request().url());
  const payload = pathname in apiResponses ? apiResponses[pathname] : {};
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

function buildSignal(
  id: number,
  overrides: Partial<{
    symbol: string;
    action: string;
    score: number | null;
    confidence: number | null;
    executed: 0 | 1;
    skip_reason: string | null;
    strategy_type: string | null;
  }> = {}
) {
  return {
    id,
    timestamp: `2026-01-${String(((id - 1) % 9) + 1).padStart(2, "0")}T00:00:00Z`,
    symbol: `COIN${String(id).padStart(2, "0")}/USDT`,
    action: id % 2 === 0 ? "sell" : "buy",
    score: 0.5 + id / 100,
    confidence: 50 + id,
    executed: (id % 2 === 0 ? 0 : 1) as 0 | 1,
    skip_reason: id % 2 === 0 ? "risk_filter" : null,
    strategy_type: id % 2 === 0 ? "mean_reversion" : "trend",
    cycle_id: 1,
    created_at: "2026-01-01",
    ...overrides,
  };
}

test.describe("Portfolio page additional coverage", () => {
  test("strategy allocation row opens detail panel with strategy metadata", async ({
    page,
  }) => {
    await installMergedApiMocks(page, {
      "/api/portfolio/state": {
        data: {
          last_updated: "2026-01-03T00:00:00Z",
          total_equity: 15000,
          strategies: {
            sol_carry: {
              symbol: "SOL/USDT",
              strategy: "carry_trade",
              allocation_pct: 30,
              equity: 4500,
              initial_equity: 4000,
              position_count: 13,
              last_signal_time: "2026-01-03T01:23:45Z",
            },
            btc_trend: {
              symbol: "BTC/USDT",
              strategy: "trend",
              allocation_pct: 70,
              equity: 10500,
              initial_equity: 10000,
              position_count: 2,
              last_signal_time: "2026-01-03T02:34:56Z",
            },
          },
        },
      },
    });
    const errors = trackConsoleErrors(page);

    await page.goto("/portfolio");
    await page.getByRole("row", { name: /SOL\/USDT carry_trade/ }).click();

    const dialog = page.getByRole("dialog", { name: "Strategy Details" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Strategy Name")).toBeVisible();
    await expect(dialog.getByText("carry_trade")).toBeVisible();
    await expect(dialog.getByText("SOL/USDT")).toBeVisible();
    await expect(dialog.getByText("Position Count")).toBeVisible();
    await expect(dialog.getByText("13")).toBeVisible();
    await expect(dialog.getByText("Last Signal Time")).toBeVisible();

    await page.getByRole("button", { name: "Close panel" }).click();
    await expect(dialog).toBeHidden();

    expectNoConsoleErrors(errors);
  });

  test("retry recovers after initial portfolio state failure", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    let portfolioStateCalls = 0;

    await page.route("**/api/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname === "/api/portfolio/state") {
        portfolioStateCalls += 1;
        if (portfolioStateCalls === 1) {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ detail: "temporary outage" }),
          });
          return;
        }
      }

      await fulfillDefaultApiRoute(route);
    });

    await page.goto("/portfolio");
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

    await page.getByRole("button", { name: "Retry" }).click();
    await expect.poll(() => portfolioStateCalls).toBeGreaterThanOrEqual(2);
    await expect(
      page.getByRole("heading", { level: 1, name: "Portfolio" })
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Strategy allocations table" })
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();

    const unexpectedErrors = errors.filter(
      (error) => !error.includes("status of 503 (Service Unavailable)")
    );
    expectNoConsoleErrors(unexpectedErrors);
  });
});

test.describe("Signals page additional coverage", () => {
  test("execution status select filters displayed signals", async ({ page }) => {
    await installMergedApiMocks(page, {
      "/api/signals": {
        signals: [
          buildSignal(1, {
            symbol: "BTC/USDT",
            executed: 1,
            skip_reason: null,
            strategy_type: "trend",
          }),
          buildSignal(2, {
            symbol: "ETH/USDT",
            executed: 0,
            skip_reason: "risk_filter",
            strategy_type: "mean_reversion",
          }),
          buildSignal(3, {
            symbol: "SOL/USDT",
            executed: 1,
            skip_reason: null,
            strategy_type: "carry_trade",
          }),
        ],
        total: 3,
        offset: 0,
        limit: 25,
      },
    });
    const errors = trackConsoleErrors(page);

    await page.goto("/signals");
    const statusSelect = page.getByRole("combobox", {
      name: "Filter by execution status",
    });

    await expect(page.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "ETH/USDT" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "SOL/USDT" })).toBeVisible();

    await statusSelect.selectOption("not_executed");
    await expect(page.getByRole("cell", { name: "ETH/USDT" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "BTC/USDT" })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "SOL/USDT" })).toHaveCount(0);

    await statusSelect.selectOption("executed");
    await expect(page.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "SOL/USDT" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "ETH/USDT" })).toHaveCount(0);

    expectNoConsoleErrors(errors);
  });

  test("signals pagination navigates across API pages", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const requestedOffsets: number[] = [];
    const firstPageSignals = Array.from({ length: 25 }, (_, index) =>
      buildSignal(index + 1)
    );
    const secondPageSignals = [
      buildSignal(26, {
        symbol: "COIN26/USDT",
        executed: 0,
        skip_reason: "risk_filter",
        strategy_type: "mean_reversion",
      }),
    ];

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.pathname === "/api/signals") {
        const offset = Number(requestUrl.searchParams.get("offset") ?? "0");
        requestedOffsets.push(offset);
        const signals = offset >= 25 ? secondPageSignals : firstPageSignals;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            signals,
            total: 26,
            offset,
            limit: 25,
          }),
        });
        return;
      }

      await fulfillDefaultApiRoute(route);
    });

    await page.goto("/signals");
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
    await expect(page.getByRole("cell", { name: "COIN01/USDT" })).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await expect(page.getByRole("cell", { name: "COIN26/USDT" })).toBeVisible();

    await page.getByRole("button", { name: "Prev" }).click();
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
    await expect(page.getByRole("cell", { name: "COIN01/USDT" })).toBeVisible();

    expect(requestedOffsets).toContain(0);
    expect(requestedOffsets).toContain(25);
    expectNoConsoleErrors(errors);
  });
});
