import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const pages = [
  "/",
  "/trades",
  "/signals",
  "/portfolio",
  "/performance",
  "/analysis",
  "/strategies",
  "/circuit-breaker",
  "/mdse",
  "/system",
] as const;

const navTargets = [
  { label: "Dashboard", path: "/" },
  { label: "Trades", path: "/trades" },
  { label: "Signals", path: "/signals" },
  { label: "Portfolio", path: "/portfolio" },
  { label: "Performance", path: "/performance" },
  { label: "Analysis", path: "/analysis" },
  { label: "Strategies", path: "/strategies" },
  { label: "Circuit Breaker", path: "/circuit-breaker" },
  { label: "MDSE", path: "/mdse" },
  { label: "System", path: "/system" },
] as const;

test.beforeEach(async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
});

test("main content keeps valid heading hierarchy across pages", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  for (const route of pages) {
    await page.goto(route);

    const h1Count = await page.locator("main h1").count();
    expect(h1Count).toBeLessThanOrEqual(1);

    const levels = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll("main h1, main h2, main h3, main h4, main h5, main h6")
      ).map((node) => Number(node.tagName.slice(1)))
    );

    expect(levels.length).toBeGreaterThan(0);
    if (h1Count === 1) {
      expect(levels[0]).toBe(1);
    }
  }

  expectNoConsoleErrors(errors);
});

test("images provide alt text when rendered", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  for (const route of pages) {
    await page.goto(route);

    const missingAltImages = await page.evaluate(() =>
      Array.from(document.querySelectorAll("img"))
        .filter((img) => (img.getAttribute("alt") ?? "").trim().length === 0)
        .map((img) => img.outerHTML)
    );

    expect(missingAltImages).toEqual([]);
  }

  expectNoConsoleErrors(errors);
});

test("tables and chart regions expose aria labels", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.goto("/trades");
  await expect(page.getByRole("table", { name: "Trades table" })).toBeVisible();

  await page.goto("/signals");
  await expect(page.getByRole("table", { name: "Signals table" })).toBeVisible();

  await page.goto("/portfolio");
  await expect(page.getByRole("img", { name: "Daily PnL chart" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Strategy allocation chart" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Strategy allocations table" })).toBeVisible();

  await page.goto("/performance");
  await expect(page.getByRole("img", { name: "Equity curve chart" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Execution quality table" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Market snapshots table" })).toBeVisible();

  await page.goto("/analysis");
  await expect(
    page.getByRole("img", { name: "Regime transition timeline chart" })
  ).toBeVisible();
  await expect(page.getByRole("table", { name: "Cycle table" })).toBeVisible();

  await page.goto("/strategies");
  await expect(page.getByRole("table", { name: "Strategy comparison table" })).toBeVisible();

  await page.goto("/mdse");
  await expect(page.getByRole("img", { name: "Detector timeline chart" })).toBeVisible();
  await expect(page.getByRole("table", { name: "MDSE trades table" })).toBeVisible();

  expectNoConsoleErrors(errors);
});

test("navigation marks the active page with aria-current", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  for (const target of navTargets) {
    await page.goto(target.path);

    const current = page.getByRole("link", { name: target.label, exact: true });
    await expect(current).toHaveAttribute("aria-current", "page");

    for (const other of navTargets) {
      if (other.label === target.label) continue;
      const inactive = page.getByRole("link", { name: other.label, exact: true });
      await expect(inactive).not.toHaveAttribute("aria-current", "page");
    }
  }

  expectNoConsoleErrors(errors);
});
