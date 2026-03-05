import { expect, test, type Page, type ViewportSize } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const mobileViewport: ViewportSize = { width: 375, height: 667 };
const tabletViewport: ViewportSize = { width: 768, height: 1024 };

function currentPath(url: string): string {
  return new URL(url).pathname;
}

async function expectPageVisible(
  page: Page,
  viewport: ViewportSize,
  heading: string
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
});

test("mobile viewport (375x667) displays dashboard", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await expectPageVisible(page, mobileViewport, "Dashboard");

  expectNoConsoleErrors(errors);
});

test("tablet viewport (768x1024) displays dashboard", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await expectPageVisible(page, tabletViewport, "Dashboard");

  expectNoConsoleErrors(errors);
});

test("mobile navigation works with hamburger menu", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.setViewportSize(mobileViewport);
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open navigation menu" });
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const tradesLink = page.getByRole("link", { name: "Trades" });
  await expect(tradesLink).toBeVisible();
  await tradesLink.click();

  await expect.poll(() => currentPath(page.url())).toBe("/trades");
  await expect(page.getByRole("heading", { level: 1, name: "Trade History" })).toBeVisible();

  expectNoConsoleErrors(errors);
});

test("charts resize and trade table stays usable on small screens", async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.setViewportSize(mobileViewport);
  await page.goto("/portfolio");

  const chart = page.getByTestId("daily-pnl-chart");
  await expect(chart).toBeVisible();
  const mobileChartWidth = await chart.evaluate((el) => el.getBoundingClientRect().width);

  await page.setViewportSize(tabletViewport);
  await page.reload();
  await expect(chart).toBeVisible();
  const tabletChartWidth = await chart.evaluate((el) => el.getBoundingClientRect().width);

  expect(mobileChartWidth).toBeGreaterThan(0);
  expect(tabletChartWidth).toBeGreaterThan(mobileChartWidth);

  await page.setViewportSize(mobileViewport);
  await page.goto("/trades");

  const tradeTable = page.getByRole("table").first();
  await expect(tradeTable).toBeVisible();

  const tableScroller = tradeTable
    .locator("xpath=ancestor::div[contains(@class,'overflow-x-auto')]")
    .first();

  const hasOverflow = await tableScroller.evaluate((el) => el.scrollWidth > el.clientWidth);

  if (hasOverflow) {
    const scrollLeft = await tableScroller.evaluate((el) => {
      el.scrollLeft = Math.min(120, el.scrollWidth);
      return el.scrollLeft;
    });
    expect(scrollLeft).toBeGreaterThan(0);
  } else {
    await expect(page.getByRole("columnheader", { name: "Symbol" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "PnL" })).toBeVisible();
  }

  expectNoConsoleErrors(errors);
});
