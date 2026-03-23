import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const pagesWithFilter = [
  { path: "/trades", endpoint: "/api/trades" },
  { path: "/signals", endpoint: "/api/signals" },
  { path: "/performance", endpoint: "/api/performance/summary" },
  { path: "/portfolio", endpoint: "/api/portfolio/state" },
  { path: "/strategies", endpoint: "/api/strategies" },
];

type RequestGroup = {
  label: string;
  paths: string[];
};

const performanceRequestGroups: RequestGroup[] = [
  { label: "summary", paths: ["/api/performance/summary"] },
  { label: "execution quality", paths: ["/api/performance/execution-quality"] },
  { label: "market snapshots", paths: ["/api/performance/market-snapshots"] },
  {
    label: "equity curve",
    paths: ["/api/equity-curve", "/api/performance/equity-curve"],
  },
  { label: "trades by strategy", paths: ["/api/trades/by-strategy"] },
];

const portfolioRequestGroups: RequestGroup[] = [
  { label: "portfolio state", paths: ["/api/portfolio/state"] },
  { label: "equity curve", paths: ["/api/equity-curve", "/api/performance/equity-curve"] },
  { label: "strategy performance", paths: ["/api/performance/by-strategy"] },
];

const strategiesRequestGroups: RequestGroup[] = [
  { label: "strategies", paths: ["/api/strategies"] },
  { label: "strategy performance", paths: ["/api/performance/by-strategy"] },
];

function expectNoUnexpectedConsoleErrors(errors: string[]): void {
  const unexpected = errors.filter(
    (error) =>
      !error.includes("Minified React error #418") &&
      !error.includes("react.dev/errors/418")
  );
  expectNoConsoleErrors(unexpected);
}

function getCallsForPaths(apiCalls: string[], paths: string[]): URL[] {
  return apiCalls
    .map((url) => new URL(url))
    .filter((url) => paths.includes(url.pathname));
}

async function expectPerformanceRequestMode(
  apiCalls: string[],
  requestGroups: RequestGroup[],
  expectedMode: string | null
): Promise<void> {
  await expect
    .poll(() =>
      requestGroups.map(({ label, paths }) => {
        const matchingCalls = getCallsForPaths(apiCalls, paths);
        if (matchingCalls.length === 0) return `${label}:missing`;
        const matchesExpectedMode = matchingCalls.every((url) =>
          expectedMode === null
            ? !url.searchParams.has("execution_mode")
            : url.searchParams.get("execution_mode") === expectedMode
        );
        return matchesExpectedMode ? `${label}:ok` : `${label}:mismatch`;
      })
    )
    .toEqual(requestGroups.map(({ label }) => `${label}:ok`));
}

test.beforeEach(async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
});

for (const target of pagesWithFilter) {
  test(`execution mode filter renders on ${target.path}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(target.path);
    const filterGroup = page.getByRole("group", {
      name: "Execution mode filter",
    });
    await expect(filterGroup).toBeVisible();

    await expect(
      filterGroup.getByRole("button", { name: "Live" })
    ).toHaveAttribute("aria-pressed", "true");

    expectNoUnexpectedConsoleErrors(errors);
  });

  test(`execution mode filter updates URL on ${target.path}`, async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(target.path);
    const filterGroup = page.getByRole("group", {
      name: "Execution mode filter",
    });

    await expect(page).not.toHaveURL(new RegExp("execution_mode="));
    await expect(
      filterGroup.getByRole("button", { name: "Live" })
    ).toHaveAttribute("aria-pressed", "true");

    await filterGroup.getByRole("button", { name: "Dry-run" }).click();
    await expect(page).toHaveURL(new RegExp("execution_mode=dry_run"));
    await expect(
      filterGroup.getByRole("button", { name: "Dry-run" })
    ).toHaveAttribute("aria-pressed", "true");

    await filterGroup.getByRole("button", { name: "All" }).click();
    await expect(page).toHaveURL(new RegExp("execution_mode=all"));
    await expect(
      filterGroup.getByRole("button", { name: "All" })
    ).toHaveAttribute("aria-pressed", "true");

    await filterGroup.getByRole("button", { name: "Live" }).click();
    await expect(page).not.toHaveURL(new RegExp("execution_mode="));
    await expect(
      filterGroup.getByRole("button", { name: "Live" })
    ).toHaveAttribute("aria-pressed", "true");

    expectNoUnexpectedConsoleErrors(errors);
  });
}

for (const target of pagesWithFilter) {
  test(`execution mode sends query param to API on ${target.path}`, async ({
    page,
  }) => {
    const apiCalls: string[] = [];

    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      apiCalls.push(url);
      const { pathname } = new URL(url);
      const payload =
        pathname in defaultApiResponses ? defaultApiResponses[pathname] : {};
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });

    await page.goto(`${target.path}?execution_mode=paper`);
    await page.waitForTimeout(500);

    const targetCalls = apiCalls.filter((url) => url.includes(target.endpoint));
    expect(targetCalls.length).toBeGreaterThan(0);
    expect(targetCalls.some((url) => url.includes("execution_mode=paper"))).toBeTruthy();
  });
}

test("performance filter propagates execution_mode to all dependent APIs and clears it for All", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  const apiCalls: string[] = [];

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    apiCalls.push(url);
    const { pathname } = new URL(url);
    const payload =
      pathname in defaultApiResponses ? defaultApiResponses[pathname] : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/performance");
  await expect(
    page.getByRole("heading", { level: 1, name: "Performance" })
  ).toBeVisible();
  const filterGroup = page.getByRole("group", {
    name: "Execution mode filter",
  });
  await expectPerformanceRequestMode(apiCalls, performanceRequestGroups, "live");

  apiCalls.length = 0;
  await filterGroup.getByRole("button", { name: "Paper" }).click();
  await expect(page).toHaveURL(/execution_mode=paper/);
  await expectPerformanceRequestMode(apiCalls, performanceRequestGroups, "paper");

  apiCalls.length = 0;
  await filterGroup.getByRole("button", { name: "All" }).click();
  await expect(page).toHaveURL(/execution_mode=all/);
  await expectPerformanceRequestMode(apiCalls, performanceRequestGroups, null);

  expectNoUnexpectedConsoleErrors(errors);
});

test("test_performance_default_mode_is_live", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const apiCalls: string[] = [];

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    apiCalls.push(url);
    const { pathname } = new URL(url);
    const payload =
      pathname in defaultApiResponses ? defaultApiResponses[pathname] : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/performance");

  const filterGroup = page.getByRole("group", {
    name: "Execution mode filter",
  });
  await expect(
    filterGroup.getByRole("button", { name: "Live" })
  ).toHaveAttribute("aria-pressed", "true");
  await expectPerformanceRequestMode(apiCalls, performanceRequestGroups, "live");
  await expect(page.getByText(/\(3\.20%\)/)).toBeVisible();

  expectNoUnexpectedConsoleErrors(errors);
});

test("portfolio filter propagates execution_mode to all dependent APIs and clears it for All", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  const apiCalls: string[] = [];

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    apiCalls.push(url);
    const { pathname } = new URL(url);
    const payload =
      pathname in defaultApiResponses ? defaultApiResponses[pathname] : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/portfolio");
  await expect(
    page.getByRole("heading", { level: 1, name: "Portfolio" })
  ).toBeVisible();
  await expectPerformanceRequestMode(apiCalls, portfolioRequestGroups, "live");

  apiCalls.length = 0;
  await page.getByRole("button", { name: "Paper" }).click();
  await expect(page).toHaveURL(/execution_mode=paper/);
  await expectPerformanceRequestMode(apiCalls, portfolioRequestGroups, "paper");

  apiCalls.length = 0;
  await page.getByRole("button", { name: "All" }).click();
  await expect(page).toHaveURL(/execution_mode=all/);
  await expectPerformanceRequestMode(apiCalls, portfolioRequestGroups, null);

  expectNoUnexpectedConsoleErrors(errors);
});

test("strategies filter propagates execution_mode to dependent APIs and clears it for All", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  const apiCalls: string[] = [];

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    apiCalls.push(url);
    const { pathname } = new URL(url);
    const payload =
      pathname in defaultApiResponses ? defaultApiResponses[pathname] : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/strategies");
  await expect(
    page.getByRole("heading", { level: 1, name: "Strategies" })
  ).toBeVisible();
  await expectPerformanceRequestMode(apiCalls, strategiesRequestGroups, "live");

  apiCalls.length = 0;
  await page.getByRole("button", { name: "Paper" }).click();
  await expect(page).toHaveURL(/execution_mode=paper/);
  await expectPerformanceRequestMode(apiCalls, strategiesRequestGroups, "paper");

  apiCalls.length = 0;
  await page.getByRole("button", { name: "All" }).click();
  await expect(page).toHaveURL(/execution_mode=all/);
  await expectPerformanceRequestMode(apiCalls, strategiesRequestGroups, null);

  expectNoUnexpectedConsoleErrors(errors);
});

test("test_trades_default_mode_is_live", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const apiCalls: string[] = [];

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    apiCalls.push(url);
    const { pathname } = new URL(url);
    const payload =
      pathname in defaultApiResponses ? defaultApiResponses[pathname] : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/trades");

  const filterGroup = page.getByRole("group", {
    name: "Execution mode filter",
  });
  await expect(
    filterGroup.getByRole("button", { name: "Live" })
  ).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => {
      const tradeCalls = apiCalls
        .map((url) => new URL(url))
        .filter((url) => url.pathname === "/api/trades");
      if (tradeCalls.length === 0) return "missing";
      return tradeCalls.every((url) => url.searchParams.get("execution_mode") === "live")
        ? "live"
        : "mismatch";
    })
    .toBe("live");

  expectNoUnexpectedConsoleErrors(errors);
});

test("test_execution_mode_filter_switch", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const pageMode =
      new URL(page.url() === "about:blank" ? "http://localhost/performance" : page.url())
        .searchParams.get("execution_mode") ?? "live";
    const mode = url.searchParams.get("execution_mode") ?? pageMode;

    if (url.pathname === "/api/performance/summary") {
      const payload =
        mode === "paper"
          ? {
              total_trades: 4,
              winning_trades: 3,
              losing_trades: 1,
              win_rate: 0.75,
              total_pnl: 120,
              profit_factor: 1.8,
              avg_slippage: 0.05,
              initial_balance: 10000,
            }
          : mode === "all"
            ? {
                total_trades: 9,
                winning_trades: 5,
                losing_trades: 4,
                win_rate: 0.55,
                total_pnl: 999,
                profit_factor: 1.2,
                avg_slippage: 0.05,
                initial_balance: null,
              }
            : {
                total_trades: 2,
                winning_trades: 2,
                losing_trades: 0,
                win_rate: 1,
                total_pnl: 96.87,
                profit_factor: 2.1,
                avg_slippage: 0.03,
                initial_balance: 656.87,
              };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
      return;
    }

    if (
      url.pathname === "/api/equity-curve" ||
      url.pathname === "/api/performance/equity-curve"
    ) {
      const payload =
        mode === "paper"
          ? {
              data: [
                { date: "2026-01-01", balance: 10050, daily_pnl: 50, cumulative_pnl: 50 },
                { date: "2026-01-02", balance: 10120, daily_pnl: 70, cumulative_pnl: 120 },
              ],
              total_days: 2,
              start_date: "2026-01-01",
              end_date: "2026-01-02",
              initial_balance: 10000,
            }
          : mode === "all"
            ? {
                data: [
                  { date: "2026-01-01", balance: 1200, daily_pnl: 100, cumulative_pnl: 100 },
                  { date: "2026-01-02", balance: 1655.87, daily_pnl: 455.87, cumulative_pnl: 555.87 },
                ],
                total_days: 2,
                start_date: "2026-01-01",
                end_date: "2026-01-02",
                initial_balance: null,
              }
            : {
                data: [
                  { date: "2026-01-01", balance: 700, daily_pnl: 43.13, cumulative_pnl: 43.13 },
                  { date: "2026-01-02", balance: 753.74, daily_pnl: 53.74, cumulative_pnl: 96.87 },
                ],
                total_days: 2,
                start_date: "2026-01-01",
                end_date: "2026-01-02",
                initial_balance: 656.87,
              };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
      return;
    }

    const payload =
      url.pathname in defaultApiResponses ? defaultApiResponses[url.pathname] : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/performance");
  await expect(page.getByText("+96.87")).toBeVisible();
  await expect(page.getByText(/\(14\.75%\)/)).toBeVisible();
  const filterGroup = page.getByRole("group", {
    name: "Execution mode filter",
  });

  await filterGroup.getByRole("button", { name: "Paper" }).click();
  await expect(page.getByText("+120.00")).toBeVisible();
  await expect(page.getByText(/\(1\.20%\)/)).toBeVisible();

  await filterGroup.getByRole("button", { name: "All" }).click();
  await expect(page.getByText("+999.00")).toBeVisible();
  await expect(page.getByText(/\(14\.75%\)/)).toHaveCount(0);
  await expect(page.getByText(/\(1\.20%\)/)).toHaveCount(0);

  expectNoUnexpectedConsoleErrors(errors);
});
