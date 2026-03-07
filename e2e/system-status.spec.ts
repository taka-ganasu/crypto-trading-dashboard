import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  nullSafeApiResponses,
  trackConsoleErrors,
} from "./test-utils";

test("dashboard renders system overview widget", async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
  const errors = trackConsoleErrors(page);

  await page.goto("/");

  await expect(page.getByText("System Overview")).toBeVisible();
  await expect(page.getByTestId("system-status-widget")).toBeVisible();
  await expect(page.getByTestId("bot-status-value")).toHaveText(/healthy/i);

  await expect(page.getByTestId("stats-recent-trades")).toHaveText("12");
  await expect(page.getByTestId("stats-recent-signals")).toHaveText("34");
  await expect(page.getByTestId("stats-mdse-events")).toHaveText("5");
  await expect(page.getByTestId("stats-api-version")).toHaveText("v1.3.0");
  await expect(page.getByTestId("stats-last-updated")).not.toHaveText("—");

  expectNoConsoleErrors(errors);
});

test("dashboard system overview is null-safe", async ({ page }) => {
  await installApiMocks(page, nullSafeApiResponses);
  const errors = trackConsoleErrors(page);

  await page.goto("/");

  await expect(page.getByText("System Overview")).toBeVisible();
  await expect(page.getByTestId("bot-status-value")).toHaveText(/unknown/i);
  await expect(page.getByTestId("stats-recent-trades")).toHaveText("No data");
  await expect(page.getByTestId("stats-recent-signals")).toHaveText("No data");
  await expect(page.getByTestId("stats-mdse-events")).toHaveText("No data");
  await expect(page.getByTestId("stats-api-version")).toHaveText("—");
  await expect(page.getByTestId("stats-last-updated")).toHaveText("—");

  expectNoConsoleErrors(errors);
});

