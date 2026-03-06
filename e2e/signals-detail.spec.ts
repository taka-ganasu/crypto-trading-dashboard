import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Signals detail page", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders signals table with expected headers and data", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/signals");

    await expect(
      page.getByRole("heading", { level: 1, name: "Signals" })
    ).toBeVisible();
    await expect(page.getByText("1 signals")).toBeVisible();

    const table = page.getByRole("table", { name: "Signals table" });
    await expect(table).toBeVisible();

    await expect(table.getByRole("columnheader", { name: "Timestamp" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Symbol" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Action" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Score" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Confidence" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Executed" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Skip Reason" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Strategy" })).toBeVisible();

    await expect(table.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();
    await expect(table.getByRole("cell", { name: "BUY" })).toBeVisible();
    await expect(table.getByRole("cell", { name: "trend" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("supports time-range filter interaction", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/signals");

    const filterGroup = page.getByRole("group", {
      name: "Time range filter",
    });
    await expect(filterGroup).toBeVisible();

    await filterGroup.getByRole("button", { name: "30d" }).click();
    await expect(page).toHaveURL(/range=30d/);

    await filterGroup.getByRole("button", { name: "24h" }).click();
    await expect(page).toHaveURL(/range=24h/);

    await filterGroup.getByRole("button", { name: "All" }).click();
    await expect(page).toHaveURL(/range=all/);

    expectNoConsoleErrors(errors);
  });
});
