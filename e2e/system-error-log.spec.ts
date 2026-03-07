import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  trackConsoleErrors,
} from "./test-utils";

test.describe("System page error log tab", () => {
  test("renders colored rows and expandable traceback with default query params", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);
    const errorRequestUrls: string[] = [];

    await page.route("**/api/**", async (route) => {
      const requestUrl = route.request().url();
      const parsed = new URL(requestUrl);
      if (parsed.pathname === "/api/errors") {
        errorRequestUrls.push(requestUrl);
      }

      const payload = defaultApiResponses[parsed.pathname] ?? {};
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });

    await page.goto("/system");
    await expect
      .poll(() => errorRequestUrls.length, { message: "error API should be requested" })
      .toBeGreaterThan(0);

    const firstRequest = new URL(errorRequestUrls[0]);
    expect(firstRequest.searchParams.get("since")).not.toBeNull();
    expect(firstRequest.searchParams.get("status_gte")).toBe("400");
    expect(firstRequest.searchParams.get("limit")).toBe("50");

    await page.getByTestId("system-tab-error-log").click();
    await expect(page.getByTestId("error-log-table")).toBeVisible();

    const rows = page.getByTestId("error-log-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveClass(/bg-red-500\/10/);
    await expect(rows.nth(1)).toHaveClass(/bg-yellow-500\/10/);

    await page.getByRole("button", { name: "Show traceback" }).click();
    await expect(page.getByTestId("error-traceback")).toContainText(
      "RuntimeError: service down"
    );
    await page.getByRole("button", { name: "Hide traceback" }).click();
    await expect(page.getByTestId("error-traceback")).toHaveCount(0);

    expectNoConsoleErrors(errors);
  });

  test("keeps system info available when error API request fails", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.route("**/api/**", async (route) => {
      const parsed = new URL(route.request().url());
      if (parsed.pathname === "/api/errors") {
        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: "not-json",
        });
        return;
      }
      const payload = defaultApiResponses[parsed.pathname] ?? {};
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });

    await page.goto("/system");
    await expect(page.getByRole("heading", { level: 1, name: "System" })).toBeVisible();
    await expect(page.getByTestId("go-live-widget")).toBeVisible();

    await page.getByTestId("system-tab-error-log").click();
    await expect(page.getByText("Failed to load API error logs.")).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
