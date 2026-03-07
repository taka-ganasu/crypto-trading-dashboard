import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  nullSafeApiResponses,
  trackConsoleErrors,
} from "./test-utils";

test.describe("System page version panel", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders API/Bot/Dashboard versions and removes go-live widget", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/system");

    await expect(
      page.getByRole("heading", { level: 1, name: "System" })
    ).toBeVisible();
    await expect(page.getByTestId("api-info-heading")).toBeVisible();
    await expect(page.getByTestId("api-version-value")).toHaveText("1.0.0");
    await expect(page.getByTestId("bot-version-value")).toHaveText("0.2.0");
    await expect(page.getByTestId("dashboard-version-value")).toHaveText("0.2.0");
    await expect(page.getByTestId("go-live-widget")).toHaveCount(0);

    expectNoConsoleErrors(errors);
  });

  test("renders bot version with null-safe fallback", async ({ page }) => {
    await installApiMocks(page, nullSafeApiResponses);
    const errors = trackConsoleErrors(page);

    await page.goto("/system");
    await expect(page.getByTestId("bot-version-value")).toHaveText("—");

    expectNoConsoleErrors(errors);
  });
});
