import { expect, test, type Locator } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

async function expectChartHasData(
  chart: Locator,
  dataSelector: string
): Promise<void> {
  await expect(chart).toBeVisible();
  await expect(chart.locator("svg").first()).toBeVisible();
  await expect
    .poll(async () => chart.locator(dataSelector).count())
    .toBeGreaterThan(0);
}

test.describe("Performance chart continuity", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("Performance ページが正常にロードされる", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    await expect(
      page.getByRole("heading", { level: 1, name: "Performance" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cumulative PnL" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Equity Curve" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Daily PnL by Strategy" })
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("Equity Curve チャートが表示され、データポイントが存在する", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    const chart = page.getByTestId("equity-curve-chart");
    await expectChartHasData(chart, ".recharts-area-area");

    expectNoConsoleErrors(errors);
  });

  test("Cumulative PnL チャートが表示され、データポイントが存在する", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    const chart = page.getByTestId("cumulative-pnl-chart");
    await expectChartHasData(chart, ".recharts-area-area");

    expectNoConsoleErrors(errors);
  });

  test("Daily PnL by Strategy チャートが表示され、データポイントが存在する", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    await expectChartHasData(
      page.getByTestId("daily-strategy-pnl-chart"),
      ".recharts-bar-rectangle"
    );

    expectNoConsoleErrors(errors);
  });

  test("Weekly toggle でCumulative PnLが正しく切り替わる", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");

    const chart = page.getByTestId("cumulative-pnl-chart");
    await expectChartHasData(chart, ".recharts-area-area");
    const areaPath = chart.locator(".recharts-area-area").first();
    const dailyPath = await areaPath.getAttribute("d");

    await page.getByRole("button", { name: "Weekly" }).click();
    await expect(page.getByRole("button", { name: "Weekly" })).toHaveClass(/bg-zinc-700/);
    await expect
      .poll(async () => (await areaPath.getAttribute("d")) !== dailyPath)
      .toBe(true);
    await expectChartHasData(chart, ".recharts-area-area");

    expectNoConsoleErrors(errors);
  });
});
