import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Performance page remaining coverage", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders equity curve chart and market snapshot values", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");

    await expect(
      page.getByRole("heading", { level: 1, name: "Performance" })
    ).toBeVisible();

    const chart = page.getByTestId("equity-curve-chart");
    await expect(chart).toBeVisible();
    await expect(chart.locator("svg").first()).toBeVisible();

    const snapshotsTable = page.getByRole("table", {
      name: "Market snapshots table",
    });
    await expect(snapshotsTable).toBeVisible();
    await expect(snapshotsTable.getByRole("cell", { name: "BTC/USDT" })).toBeVisible();
    await expect(snapshotsTable.getByRole("cell", { name: "50.0" })).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("opens and closes execution detail panel for selected row", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");

    await page.getByRole("row", { name: /#1/ }).click();

    const dialog = page.getByRole("dialog", {
      name: "Execution Quality Details",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Trade ID")).toBeVisible();
    await expect(dialog.getByText("#1")).toBeVisible();
    await expect(dialog.getByText("Slippage %")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    expectNoConsoleErrors(errors);
  });
});
