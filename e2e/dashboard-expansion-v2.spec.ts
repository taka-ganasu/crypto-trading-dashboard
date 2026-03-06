import { expect, test, type Route } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

type ApiPayloadMap = Record<string, unknown>;

type RouteDecision = {
  status?: number;
  body: unknown;
};

const apiResponses = defaultApiResponses as ApiPayloadMap;

const singleTradeResponse = [
  {
    id: 11,
    symbol: "BTC/USDT",
    side: "BUY",
    entry_price: 100000,
    exit_price: 100250,
    quantity: 0.1,
    pnl: 25,
    pnl_pct: 0.25,
    fees: 1,
    entry_time: "2026-01-01T00:00:00Z",
    exit_time: "2026-01-01T01:00:00Z",
    exit_reason: "tp",
    strategy: "trend",
    cycle_id: 1,
    created_at: "2026-01-01",
  },
];

const multiTradeResponse = [
  ...singleTradeResponse,
  {
    id: 12,
    symbol: "ETH/USDT",
    side: "SELL",
    entry_price: 3000,
    exit_price: 2950,
    quantity: 1.2,
    pnl: 60,
    pnl_pct: 2.0,
    fees: 2,
    entry_time: "2026-01-02T00:00:00Z",
    exit_time: "2026-01-02T02:00:00Z",
    exit_reason: "tp",
    strategy: "mean_reversion",
    cycle_id: 2,
    created_at: "2026-01-02",
  },
];

async function fulfillApiRoute(
  route: Route,
  resolver?: (url: URL) => RouteDecision | null
): Promise<void> {
  const url = new URL(route.request().url());
  const resolved = resolver?.(url);
  if (resolved != null) {
    await route.fulfill({
      status: resolved.status ?? 200,
      contentType: "application/json",
      body: JSON.stringify(resolved.body),
    });
    return;
  }

  const payload = url.pathname in apiResponses ? apiResponses[url.pathname] : {};
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

test.describe("Dashboard E2E expansion v2 — time range filter", () => {
  test("trades defaults to 7d with correct active button", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/trades");

    const filter = page.getByRole("group", { name: "Time range filter" });
    await expect(filter).toBeVisible();
    await expect(filter.getByRole("button", { name: "7d" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(filter.getByRole("button", { name: "24h" })).toBeVisible();
    await expect(filter.getByRole("button", { name: "30d" })).toBeVisible();
    await expect(filter.getByRole("button", { name: "90d" })).toBeVisible();
    await expect(filter.getByRole("button", { name: "All" })).toBeVisible();
    expect(page.url()).not.toContain("range=");

    expectNoConsoleErrors(errors);
  });

  test("trades 24h selection updates URL and sends start/end params", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const tradesCalls: string[] = [];

    await page.route("**/api/**", async (route) => {
      const requestUrl = route.request().url();
      const parsed = new URL(requestUrl);
      if (parsed.pathname === "/api/trades") {
        tradesCalls.push(requestUrl);
      }
      await fulfillApiRoute(route);
    });

    await page.goto("/trades");
    await page.getByRole("button", { name: "24h" }).click();
    await expect(page).toHaveURL(/range=24h/);

    await expect
      .poll(() => tradesCalls[tradesCalls.length - 1] ?? "")
      .toContain("start=");
    await expect
      .poll(() => tradesCalls[tradesCalls.length - 1] ?? "")
      .toContain("end=");

    expectNoConsoleErrors(errors);
  });

  test("returning to 7d removes range query while preserving tradeId", async ({
    page,
  }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/trades?tradeId=1&range=30d");
    await page.getByRole("button", { name: "7d" }).click();

    await expect(page).toHaveURL(/\/trades\?tradeId=1$/);
    expect(page.url()).not.toContain("range=");

    expectNoConsoleErrors(errors);
  });

  test("invalid range query falls back to 7d active state on signals", async ({
    page,
  }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/signals?range=1m");
    const filter = page.getByRole("group", { name: "Time range filter" });
    await expect(filter.getByRole("button", { name: "7d" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await filter.getByRole("button", { name: "30d" }).click();
    await expect(page).toHaveURL(/range=30d/);

    expectNoConsoleErrors(errors);
  });

  test("mdse All range uses hours-based queries without start/end", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const mdseCalls: string[] = [];

    await page.route("**/api/**", async (route) => {
      const requestUrl = route.request().url();
      const parsed = new URL(requestUrl);
      if (
        parsed.pathname === "/api/mdse/events" ||
        parsed.pathname === "/api/mdse/trades" ||
        parsed.pathname === "/api/mdse/timeline"
      ) {
        mdseCalls.push(requestUrl);
      }
      await fulfillApiRoute(route);
    });

    await page.goto("/mdse?range=24h");
    await page.getByRole("button", { name: "All" }).click();
    await expect(page).toHaveURL(/range=all/);

    const lastEventsCall = mdseCalls
      .filter((call) => call.includes("/api/mdse/events"))
      .at(-1);
    expect(lastEventsCall).toBeDefined();
    expect(lastEventsCall).toContain("hours=24");
    expect(lastEventsCall).not.toContain("start=");
    expect(lastEventsCall).not.toContain("end=");

    expectNoConsoleErrors(errors);
  });
});

test.describe("Dashboard E2E expansion v2 — trades interactions", () => {
  test("trades table updates rows when filter changes query shape", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname !== "/api/trades") return null;
        const hasTimeWindow =
          url.searchParams.has("start") && url.searchParams.has("end");
        return {
          body: hasTimeWindow ? singleTradeResponse : multiTradeResponse,
        };
      });
    });

    await page.goto("/trades");
    await expect(page.getByText("1 trades")).toBeVisible();
    await expect(page.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();

    await page.getByRole("button", { name: "All" }).click();
    await expect(page).toHaveURL(/range=all/);
    await expect(page.getByText("2 trades")).toBeVisible();
    await expect(page.getByRole("cell", { name: "ETH/USDT" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("trades renders empty state when filter response becomes empty", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname !== "/api/trades") return null;
        const hasTimeWindow =
          url.searchParams.has("start") && url.searchParams.has("end");
        return { body: hasTimeWindow ? multiTradeResponse : [] };
      });
    });

    await page.goto("/trades?range=30d");
    await expect(page.getByText("2 trades")).toBeVisible();

    await page.getByRole("button", { name: "All" }).click();
    await expect(page.getByText("0 trades")).toBeVisible();
    await expect(page.getByText("No trades found")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("trades detail panel remains usable at mobile viewport 375px", async ({
    page,
  }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/trades");

    await page.getByRole("row", { name: /BTC\/USDT/ }).click();
    const dialog = page.getByRole("dialog", { name: "Trade Details" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Trade ID")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    expectNoConsoleErrors(errors);
  });
});

test.describe("Dashboard E2E expansion v2 — strategy and allocation", () => {
  test("strategy details can be opened for multiple cards sequentially", async ({
    page,
  }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    await page.getByRole("button", { name: /trend_following/ }).click();

    const dialog = page.getByRole("dialog", { name: "Strategy Details" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("trend_following")).toBeVisible();

    await page.getByRole("button", { name: "Close panel" }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: /mean_reversion/ }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("mean_reversion")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("strategy detail panel closes via Escape key", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    await page.getByRole("button", { name: /trend_following/ }).click();

    const dialog = page.getByRole("dialog", { name: "Strategy Details" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    expectNoConsoleErrors(errors);
  });

  test("strategy table sort indicator toggles DESC to ASC on repeated clicks", async ({
    page,
  }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    const winRateHeader = page.getByRole("columnheader", { name: "Win Rate" });
    const winRateSortButton = winRateHeader.getByRole("button", {
      name: "Win Rate",
    });
    const firstStrategyCell = page.locator("tbody tr").first().locator("td").first();

    await expect(winRateHeader).toContainText("SORT");

    await winRateSortButton.click();
    await expect(winRateHeader).toContainText("DESC");
    await expect(firstStrategyCell).toHaveText("trend_following");

    await winRateSortButton.click();
    await expect(winRateHeader).toContainText("ASC");
    await expect(firstStrategyCell).toHaveText("mean_reversion");

    expectNoConsoleErrors(errors);
  });

  test("portfolio shows allocation chart from strategy performance fallback data", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname === "/api/portfolio/state") {
          return { body: { data: {} } };
        }
        if (url.pathname === "/api/performance/by-strategy") {
          return {
            body: [
              {
                strategy: "trend_following",
                trade_count: 7,
                win_rate: 0.57,
                profit_factor: 1.31,
                sharpe: 0.84,
                avg_pnl: 12.4,
                max_dd: 70,
              },
              {
                strategy: "mean_reversion",
                trade_count: 3,
                win_rate: 0.33,
                profit_factor: 0.91,
                sharpe: 0.24,
                avg_pnl: -4.8,
                max_dd: 95,
              },
            ],
          };
        }
        return null;
      });
    });

    await page.goto("/portfolio");
    await expect(
      page.getByText("Strategy Allocation", { exact: true })
    ).toBeVisible();
    await expect(page.getByTestId("strategy-allocation-pie")).toBeVisible();
    await expect(page.getByText("No strategy data available")).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});

test.describe("Dashboard E2E expansion v2 — outage and partial errors", () => {
  test("dashboard shows full outage fallback when all API calls fail", async ({
    page,
  }) => {
    await page.route("**/api/**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "service unavailable" }),
      });
    });

    await page.goto("/");
    await expect(page.getByText("Failed to load dashboard data.")).toBeVisible();
    await expect(
      page.getByText("API server response could not be retrieved.")
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  test("dashboard shows warning banner when one section fails", async ({
    page,
  }) => {
    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (url.pathname === "/api/portfolio/state") {
          return { status: 500, body: { error: "portfolio unavailable" } };
        }
        return null;
      });
    });

    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" })
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "Some sections failed to load"
    );
    await expect(
      page.getByRole("heading", { level: 2, name: "Recent Trades" })
    ).toBeVisible();
  });

  test("portfolio keeps core table and shows warning when optional APIs fail", async ({
    page,
  }) => {
    await page.route("**/api/**", async (route) => {
      await fulfillApiRoute(route, (url) => {
        if (
          url.pathname === "/api/performance/equity-curve" ||
          url.pathname === "/api/performance/by-strategy"
        ) {
          return { status: 500, body: { error: "temporary outage" } };
        }
        return null;
      });
    });

    await page.goto("/portfolio");
    await expect(page.getByRole("status")).toContainText(
      "Some sections failed to load"
    );
    await expect(page.getByText("Strategy Allocations")).toBeVisible();
    await expect(page.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();
  });
});
