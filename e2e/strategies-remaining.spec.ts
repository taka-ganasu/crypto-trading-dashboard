import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Strategies page remaining coverage", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("toggles sort indicator states for comparison table", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");

    const winRateHeader = page
      .getByRole("columnheader", { name: /Win Rate/ })
      .first();
    await expect(winRateHeader).toContainText("SORT");

    await page
      .getByRole("columnheader", { name: /Win Rate/ })
      .getByRole("button", { name: "Win Rate" })
      .click();
    await expect(winRateHeader).toContainText("DESC");

    await page
      .getByRole("columnheader", { name: /Win Rate/ })
      .getByRole("button", { name: "Win Rate" })
      .click();
    await expect(winRateHeader).toContainText("ASC");

    expectNoConsoleErrors(errors);
  });

  test("supports Escape key and backdrop close on strategy details", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");

    await page.getByRole("button", { name: /trend_following/ }).click();
    const dialog = page.getByRole("dialog", { name: "Strategy Details" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: /trend_following/ }).click();
    await expect(dialog).toBeVisible();

    await page.getByRole("button", { name: "Close details panel" }).click();
    await expect(dialog).toBeHidden();

    expectNoConsoleErrors(errors);
  });
});
