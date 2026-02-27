import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const navTargets = [
  { label: "Dashboard", path: "/", heading: "Dashboard" },
  { label: "Trades", path: "/trades", heading: "Trade History" },
  { label: "Signals", path: "/signals", heading: "Signals" },
  { label: "Portfolio", path: "/portfolio", contentText: "Strategy Allocations" },
  { label: "Performance", path: "/performance", heading: "Performance" },
  { label: "Circuit Breaker", path: "/circuit-breaker", heading: "Circuit Breaker" },
  { label: "MDSE", path: "/mdse", heading: "MDSE Detector Status" },
  { label: "System", path: "/system", heading: "System" },
] as const;

function currentPath(url: string): string {
  return new URL(url).pathname;
}

test.beforeEach(async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
});

test("sidebar links navigate to the expected pages", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.goto("/");

  for (const target of navTargets) {
    await page.getByRole("link", { name: target.label }).click();
    await expect.poll(() => currentPath(page.url())).toBe(target.path);

    if ("heading" in target) {
      await expect(
        page.getByRole("heading", { level: 1, name: target.heading })
      ).toBeVisible();
    } else {
      await expect(page.getByText(target.contentText)).toBeVisible();
    }
  }

  expectNoConsoleErrors(errors);
});

test("browser back/forward works across pages", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.goto("/");
  await page.getByRole("link", { name: "Trades" }).click();
  await expect.poll(() => currentPath(page.url())).toBe("/trades");

  await page.getByRole("link", { name: "Signals" }).click();
  await expect.poll(() => currentPath(page.url())).toBe("/signals");

  await page.goBack();
  await expect.poll(() => currentPath(page.url())).toBe("/trades");
  await expect(
    page.getByRole("heading", { level: 1, name: "Trade History" })
  ).toBeVisible();

  await page.goForward();
  await expect.poll(() => currentPath(page.url())).toBe("/signals");
  await expect(
    page.getByRole("heading", { level: 1, name: "Signals" })
  ).toBeVisible();

  expectNoConsoleErrors(errors);
});
