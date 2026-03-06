import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("Circuit Breaker page", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders heading and status description", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/circuit-breaker");
    await expect(
      page.getByRole("heading", { level: 1, name: "Circuit Breaker" })
    ).toBeVisible();
    await expect(page.getByText("Current Status")).toBeVisible();
    await expect(page.getByText("NORMAL").first()).toBeVisible();
    await expect(
      page.getByText("All systems operational. Trading is active.")
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders state transitions section with all rows", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/circuit-breaker");
    await expect(
      page.getByRole("heading", { name: "State Transitions" })
    ).toBeVisible();

    await expect(
      page.getByText("Consecutive loss threshold reached")
    ).toBeVisible();
    await expect(
      page.getByText("Further losses beyond WARNING threshold")
    ).toBeVisible();
    await expect(
      page.getByText("Critical drawdown limit exceeded")
    ).toBeVisible();
    await expect(
      page.getByText("Gradual recovery over 12 hours").first()
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("shows empty events message when no events", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/circuit-breaker");
    await expect(
      page.getByRole("heading", { name: "Recent Events" })
    ).toBeVisible();
    await expect(
      page.getByText("No circuit breaker events recorded")
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});

test.describe("Circuit Breaker with events", () => {
  test("renders events when present", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    const cbWithEvents = {
      ...defaultApiResponses,
      "/api/cb/state": {
        data: {
          status: "WARNING",
          recent_events: [
            {
              status: "WARNING",
              message: "Consecutive loss limit reached",
              timestamp: "2026-01-01T12:00:00Z",
            },
          ],
        },
      },
    };
    await installApiMocks(page, cbWithEvents);

    await page.goto("/circuit-breaker");
    await expect(page.getByText("WARNING").first()).toBeVisible();
    await expect(
      page.getByText("Consecutive loss limit reached")
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
