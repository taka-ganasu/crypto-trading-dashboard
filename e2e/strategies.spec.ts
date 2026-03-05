import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  nullSafeApiResponses,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Strategies page", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders page heading and strategy count", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    await expect(
      page.getByRole("heading", { level: 1, name: "Strategies" })
    ).toBeVisible();
    await expect(page.getByText("2 strategies")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders strategy cards with correct data", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    await expect(page.getByText("trend_following").first()).toBeVisible();
    await expect(page.getByText("mean_reversion").first()).toBeVisible();
    await expect(page.getByText("15 trades")).toBeVisible();
    await expect(page.getByText("10 trades")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders detail table with all columns", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    await expect(page.getByText("Detail Comparison")).toBeVisible();

    const headers = ["Strategy", "Trades", "Win Rate", "Profit Factor", "Sharpe", "Avg PnL", "Max DD"];
    for (const header of headers) {
      await expect(page.getByRole("columnheader", { name: header })).toBeVisible();
    }

    expectNoConsoleErrors(errors);
  });

  test("clicking a card opens detail panel", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    await page.getByRole("button", { name: /trend_following/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Strategy Details" })
    ).toBeVisible();
    await expect(page.getByText("Sharpe Ratio")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("clicking a table row opens detail panel", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    await page.getByRole("row", { name: /mean_reversion/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Strategy Details" })
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("detail panel closes on X button", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    await page.getByRole("button", { name: /trend_following/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Strategy Details" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Close panel" }).click();
    await expect(
      page.getByRole("dialog", { name: "Strategy Details" })
    ).toBeHidden();

    expectNoConsoleErrors(errors);
  });
});

test.describe("Strategies page — null safety", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, nullSafeApiResponses);
  });

  test("renders empty state without errors", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    await expect(
      page.getByRole("heading", { level: 1, name: "Strategies" })
    ).toBeVisible();
    await expect(page.getByText("0 strategies")).toBeVisible();
    await expect(page.getByText("No strategy data available")).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
