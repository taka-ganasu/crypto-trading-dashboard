import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.beforeEach(async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
});

test("analysis page renders timeline, stats, and cycle table", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.goto("/analysis");

  await expect(
    page.getByRole("heading", { level: 1, name: "Analysis" })
  ).toBeVisible();
  await expect(page.getByText("Signal Execution Rate")).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Avg Confidence" })
  ).toBeVisible();
  await expect(page.getByTestId("regime-timeline")).toBeVisible();
  await expect(page.getByText("Cycle Table")).toBeVisible();
  await expect(page.getByText("Trending").first()).toBeVisible();
  await expect(page.getByText("Macro Driven").first()).toBeVisible();

  expectNoConsoleErrors(errors);
});
