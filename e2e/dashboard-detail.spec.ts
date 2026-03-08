import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  nullSafeApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Dashboard page", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders heading and top-level cards", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" })
    ).toBeVisible();
    await expect(page.getByText("Total Balance")).toBeVisible();
    await expect(page.getByText("Daily PnL")).toBeVisible();
    await expect(
      page.getByRole("main").getByText("Circuit Breaker")
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders system overview section", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/");
    await expect(page.getByText("System Overview")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders circuit breaker status badge", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/");
    await expect(page.getByText("NORMAL").first()).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders recent trades section with trade data", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Recent Trades" })).toBeVisible();
    await expect(page.getByText("BTC/USDT").first()).toBeVisible();
    await expect(page.getByText("BUY")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("recent trade links to trade detail", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/");
    const tradeLink = page.getByRole("link", { name: /BTC\/USDT/ });
    await expect(tradeLink).toBeVisible();
    await expect(tradeLink).toHaveAttribute("href", /\/trades\?tradeId=1/);

    expectNoConsoleErrors(errors);
  });
});

test.describe("Dashboard — null safety", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, nullSafeApiResponses);
  });

  test("renders without errors when data is empty", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" })
    ).toBeVisible();
    await expect(page.getByText("No trades yet")).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
