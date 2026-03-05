import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  nullSafeApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Equity Curve Chart", () => {
  test("renders chart with data", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    await expect(page.getByRole("heading", { name: "Equity Curve" })).toBeVisible();
    await expect(page.getByTestId("equity-curve-chart")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("shows empty state when no data", async ({ page }) => {
    await installApiMocks(page, nullSafeApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/performance");
    await expect(page.getByText("No equity data available")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("performance page still shows summary cards", async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);

    await page.goto("/performance");
    await expect(page.getByText("Total PnL")).toBeVisible();
    await expect(page.getByText("Win Rate")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Equity Curve" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Execution Quality" })).toBeVisible();
  });
});
