import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  nullSafeApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Performance page", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders heading and summary cards", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    await expect(
      page.getByRole("heading", { level: 1, name: "Performance" })
    ).toBeVisible();

    await expect(page.getByText("Total PnL")).toBeVisible();
    await expect(page.getByText("Win Rate")).toBeVisible();
    await expect(page.getByText("Profit Factor")).toBeVisible();
    await expect(page.getByText("Avg Slippage")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders equity curve section", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    await expect(
      page.getByRole("heading", { name: "Equity Curve" })
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders execution quality table with headers", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    await expect(
      page.getByRole("heading", { name: "Execution Quality" })
    ).toBeVisible();

    const headers = [
      "Trade ID",
      "Expected Price",
      "Actual Price",
      "Slippage %",
      "Latency (ms)",
      "Timestamp",
    ];
    for (const header of headers) {
      await expect(
        page.getByRole("table", { name: "Execution quality table" }).getByText(header)
      ).toBeVisible();
    }

    expectNoConsoleErrors(errors);
  });

  test("renders market snapshots table with headers", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    await expect(
      page.getByRole("heading", { name: "Market Snapshots" })
    ).toBeVisible();

    const snapshotHeaders = ["Symbol", "Price", "RSI", "ADX", "MACD", "Volume"];
    for (const header of snapshotHeaders) {
      await expect(
        page.getByRole("table", { name: "Market snapshots table" }).getByText(header)
      ).toBeVisible();
    }

    await expect(page.getByText("BTC/USDT").first()).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("clicking execution row opens detail panel", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    await page.getByRole("row", { name: /#1/ }).click();
    await expect(
      page.getByRole("dialog", { name: "Execution Quality Details" })
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});

test.describe("Performance page — null safety", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, nullSafeApiResponses);
  });

  test("renders dash placeholders for null values", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    await expect(
      page.getByRole("heading", { level: 1, name: "Performance" })
    ).toBeVisible();

    const dashes = page.getByText("—");
    await expect(dashes.first()).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
