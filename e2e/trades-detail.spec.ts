import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Trades detail page", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders trades table and supports time-range filter controls", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/trades");

    await expect(
      page.getByRole("heading", { level: 1, name: "Trade History" })
    ).toBeVisible();
    await expect(page.getByText("1 trades")).toBeVisible();

    const table = page.getByRole("table", { name: "Trades table" });
    await expect(table).toBeVisible();

    const headers = [
      "Symbol",
      "Side",
      "Strategy",
      "Entry Price",
      "Exit Price",
      "PnL",
      "Entry Date",
      "Exit Date",
    ];
    for (const header of headers) {
      await expect(table.getByRole("columnheader", { name: header })).toBeVisible();
    }

    await expect(table.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();
    await expect(table.getByRole("cell", { name: "BUY" })).toBeVisible();
    await expect(table.getByRole("cell", { name: "trend" })).toBeVisible();

    const filterGroup = page.getByRole("group", { name: "Time range filter" });
    await filterGroup.getByRole("button", { name: "30d" }).click();
    await expect(page).toHaveURL(/range=30d/);

    expectNoConsoleErrors(errors);
  });

  test("supports deep-link highlight and trade detail panel interaction", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/trades?tradeId=1");

    const selectedRow = page.getByRole("row", { name: /BTC\/USDT/ });
    await expect(selectedRow).toBeVisible();
    await expect(selectedRow).toHaveClass(/bg-zinc-800\/60/);

    await selectedRow.click();

    const dialog = page.getByRole("dialog", { name: "Trade Details" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Trade ID")).toBeVisible();
    await expect(dialog.getByText("#1")).toBeVisible();
    await expect(dialog.getByText("Duration")).toBeVisible();
    await expect(dialog.getByText("1h 0m")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    expectNoConsoleErrors(errors);
  });
});
