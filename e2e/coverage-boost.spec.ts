import { expect, test, type ViewportSize } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  nullSafeApiResponses,
  trackConsoleErrors,
} from "./test-utils";

const mobileViewport: ViewportSize = { width: 375, height: 667 };

// ─── API Network Failure Tests ───────────────────────────────────

test.describe("API network failure", () => {
  test("dashboard shows fallback when API is unreachable", async ({ page }) => {
    await page.route("**/api/**", (route) => route.abort("connectionrefused"));
    await page.goto("/");
    // Page should not crash — either error boundary or empty state is acceptable
    await expect(page.locator("body")).toBeVisible();
    // No unhandled JS errors that crash the page
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });

  test("trades page handles network timeout gracefully", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      if (route.request().url().includes("/api/trades")) {
        await route.abort("timedout");
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      }
    });
    await page.goto("/trades");
    await expect(page.locator("body")).toBeVisible();
  });

  test("signals page handles 500 error without crash", async ({ page }) => {
    const errorResponses = { ...defaultApiResponses };
    await installApiMocks(page, errorResponses);
    await page.route("**/api/signals**", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Internal Server Error" }),
      })
    );
    await page.goto("/signals");
    await expect(page.locator("body")).toBeVisible();
  });
});

// ─── Empty Data State Tests ──────────────────────────────────────

test.describe("empty data state", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, nullSafeApiResponses);
  });

  test("portfolio page renders with empty data", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/portfolio");
    await expect(page.locator("main")).toBeVisible();
    expectNoConsoleErrors(errors);
  });

  test("performance page renders with empty data", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/performance");
    await expect(page.locator("main")).toBeVisible();
    expectNoConsoleErrors(errors);
  });

  test("analysis page renders with empty cycles", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/analysis");
    await expect(page.locator("main")).toBeVisible();
    expectNoConsoleErrors(errors);
  });

  test("strategies page renders with no strategies", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/strategies");
    await expect(page.locator("main")).toBeVisible();
    expectNoConsoleErrors(errors);
  });
});

// ─── Responsive: Non-Dashboard Pages ─────────────────────────────

test.describe("responsive: other pages on mobile", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("signals page is usable on mobile viewport", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.setViewportSize(mobileViewport);
    await page.goto("/signals");
    await expect(page.getByRole("heading", { level: 1, name: "Signals" })).toBeVisible();
    expectNoConsoleErrors(errors);
  });

  test("system page is usable on mobile viewport", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.setViewportSize(mobileViewport);
    await page.goto("/system");
    await expect(page.getByRole("heading", { level: 1, name: "System" })).toBeVisible();
    expectNoConsoleErrors(errors);
  });
});
