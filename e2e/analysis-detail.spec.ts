import { expect, test, type Page } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const analysisCycles = [
  {
    id: 301,
    start_time: "2026-01-03T00:00:00Z",
    end_time: "2026-01-03T00:05:00Z",
    symbols_processed: "[\"BTC/USDT\"]",
    signals_generated: 4,
    trades_executed: 2,
    errors: null,
    duration_seconds: 300,
    regime_info: "{\"regime\":\"trending\",\"avg_confidence\":80}",
    created_at: "2026-01-03T00:05:00Z",
  },
  {
    id: 302,
    start_time: "2026-01-03T00:05:00Z",
    end_time: "2026-01-03T00:10:00Z",
    symbols_processed: "[\"ETH/USDT\"]",
    signals_generated: 6,
    trades_executed: 3,
    errors: null,
    duration_seconds: 300,
    regime_info: "{\"current_regime\":\"ranging\",\"average_confidence\":55}",
    created_at: "2026-01-03T00:10:00Z",
  },
  {
    id: 303,
    start_time: "2026-01-03T00:10:00Z",
    end_time: "2026-01-03T00:15:00Z",
    symbols_processed: "[\"SOL/USDT\"]",
    signals_generated: 2,
    trades_executed: 1,
    errors: null,
    duration_seconds: 300,
    regime_info: "high_vol",
    created_at: "2026-01-03T00:15:00Z",
  },
  {
    id: 304,
    start_time: "2026-01-03T00:15:00Z",
    end_time: "2026-01-03T00:20:00Z",
    symbols_processed: "[\"XRP/USDT\"]",
    signals_generated: 0,
    trades_executed: 0,
    errors: null,
    duration_seconds: 300,
    regime_info: "{\"regime\":\"macro_driven\",\"confidence\":0.65}",
    created_at: "2026-01-03T00:20:00Z",
  },
];

const analysisDetailResponses = {
  ...defaultApiResponses,
  "/api/cycles": analysisCycles,
};

async function expectStatValue(
  page: Page,
  label: string,
  value: string
): Promise<void> {
  const card = page
    .locator("div.rounded-lg.border.border-zinc-800.bg-zinc-900.p-4")
    .filter({ has: page.getByText(label, { exact: true }) })
    .first();

  await expect(card).toBeVisible();
  await expect(card.getByText(value, { exact: true })).toBeVisible();
}

test.describe("Analysis detail page", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, analysisDetailResponses);
  });

  test("renders regime timeline and cycle table details", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/analysis");

    await expect(
      page.getByRole("heading", { level: 1, name: "Analysis" })
    ).toBeVisible();
    await expect(page.getByTestId("regime-timeline")).toBeVisible();
    await expect(page.getByLabel("cycle-301-trending")).toBeVisible();
    await expect(page.getByLabel("cycle-302-ranging")).toBeVisible();
    await expect(page.getByLabel("cycle-303-high-vol")).toBeVisible();
    await expect(page.getByLabel("cycle-304-macro-driven")).toBeVisible();
    await expect(page.getByText("Cycle Table")).toBeVisible();
    await expect(page.getByRole("cell", { name: "#301" })).toBeVisible();
    await expect(page.getByText("Macro Driven").first()).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders signal statistics summary values", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/analysis");

    await expectStatValue(page, "Total Cycles", "4");
    await expectStatValue(page, "Total Signals", "12");
    await expectStatValue(page, "Signal Execution Rate", "50.0%");
    await expectStatValue(page, "Avg Confidence", "66.7%");

    expectNoConsoleErrors(errors);
  });
});

test("range query integration keeps analysis page stable and requests cycles API", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  const cyclesCalls: string[] = [];
  const fallbackResponses = defaultApiResponses as Record<string, unknown>;

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    const { pathname } = new URL(url);

    if (pathname === "/api/cycles") {
      cyclesCalls.push(url);
    }

    const payload =
      pathname === "/api/cycles"
        ? analysisCycles
        : (fallbackResponses[pathname] ?? {});

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/analysis?range=24h");

  await expect(page).toHaveURL(/range=24h/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Analysis" })
  ).toBeVisible();
  await expect(page.getByTestId("regime-timeline")).toBeVisible();

  await expect
    .poll(() => cyclesCalls.filter((url) => url.includes("/api/cycles")).length)
    .toBeGreaterThan(0);

  expectNoConsoleErrors(errors);
});

test("time range filter updates URL and cycles request parameters", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  const cyclesCalls: URL[] = [];
  const fallbackResponses = defaultApiResponses as Record<string, unknown>;

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/cycles") {
      cyclesCalls.push(url);
    }

    const payload =
      url.pathname === "/api/cycles"
        ? analysisCycles
        : (fallbackResponses[url.pathname] ?? {});

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/analysis");

  const filterGroup = page.getByRole("group", { name: "Time range filter" });
  await expect(filterGroup.getByRole("button", { name: "7d" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await expect.poll(() => cyclesCalls.length).toBeGreaterThan(0);
  const defaultCall = cyclesCalls[cyclesCalls.length - 1];
  expect(defaultCall.searchParams.get("limit")).toBe("100");
  expect(defaultCall.searchParams.has("start")).toBeTruthy();
  expect(defaultCall.searchParams.has("end")).toBeTruthy();

  cyclesCalls.length = 0;
  await filterGroup.getByRole("button", { name: "24h" }).click();
  await expect(page).toHaveURL(/range=24h/);
  await expect(filterGroup.getByRole("button", { name: "24h" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect.poll(() => cyclesCalls.length).toBeGreaterThan(0);
  const rangeCall = cyclesCalls[cyclesCalls.length - 1];
  expect(rangeCall.searchParams.has("start")).toBeTruthy();
  expect(rangeCall.searchParams.has("end")).toBeTruthy();

  cyclesCalls.length = 0;
  await filterGroup.getByRole("button", { name: "All" }).click();
  await expect(page).toHaveURL(/range=all/);
  await expect(filterGroup.getByRole("button", { name: "All" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect.poll(() => cyclesCalls.length).toBeGreaterThan(0);
  const allCall = cyclesCalls[cyclesCalls.length - 1];
  expect(allCall.searchParams.has("start")).toBeFalsy();
  expect(allCall.searchParams.has("end")).toBeFalsy();

  expectNoConsoleErrors(errors);
});

test("shows an error alert when the analysis cycles request fails", async ({
  page,
}) => {
  const errors = trackConsoleErrors(page);
  const fallbackResponses = defaultApiResponses as Record<string, unknown>;

  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname === "/api/cycles") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "forced failure" }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fallbackResponses[pathname] ?? {}),
    });
  });

  await page.goto("/analysis");

  await expect(
    page.getByRole("heading", { level: 1, name: "Analysis" })
  ).toBeVisible();
  await expect(
    page.locator('[role="alert"]').filter({ hasText: "Data unavailable:" }).first()
  ).toContainText("Data unavailable:");
  await expect(page.getByText(/API error: 500/)).toBeVisible();

  expectNoConsoleErrors(
    errors.filter(
      (error) =>
        !error.includes("Failed to load resource: the server responded with a status of 500")
    )
  );
});
