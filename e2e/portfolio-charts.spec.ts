import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  nullSafeApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Portfolio Charts", () => {
  test("renders Daily PnL chart with data", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/portfolio");
    await expect(page.getByText("Daily PnL")).toBeVisible();
    await expect(page.getByTestId("daily-pnl-chart")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders Strategy Allocation pie chart", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/portfolio");
    await expect(page.getByText("Strategy Allocation", { exact: true })).toBeVisible();
    await expect(page.getByTestId("strategy-allocation-pie")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("charts handle empty data gracefully", async ({ page }) => {
    await installApiMocks(page, nullSafeApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/portfolio");

    // Page should render without crashing
    await expect(page.getByText("Daily PnL")).toBeVisible();
    await expect(page.getByText("Strategy Allocation", { exact: true })).toBeVisible();

    // Empty-state messages should appear
    await expect(
      page.getByText("No PnL data available")
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("charts coexist with strategy table", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/portfolio");

    // Charts visible
    await expect(page.getByText("Daily PnL")).toBeVisible();
    await expect(page.getByText("Strategy Allocation", { exact: true })).toBeVisible();

    // Strategy table still visible
    await expect(page.getByText("Strategy Allocations")).toBeVisible();
    await expect(page.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
