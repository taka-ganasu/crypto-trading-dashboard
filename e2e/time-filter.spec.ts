import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const pagesWithFilter = [
  { path: "/trades", heading: "Trade History" },
  { path: "/signals", heading: "Signals" },
  { path: "/mdse", heading: "MDSE Detector Status" },
];

test.beforeEach(async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
});

for (const target of pagesWithFilter) {
  test(`time filter renders on ${target.path}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(target.path);
    const filterGroup = page.getByRole("group", {
      name: "Time range filter",
    });
    await expect(filterGroup).toBeVisible();

    // Default selection is 7d
    const btn7d = filterGroup.getByRole("button", { name: "7d" });
    await expect(btn7d).toHaveAttribute("aria-pressed", "true");

    expectNoConsoleErrors(errors);
  });

  test(`time filter updates URL on ${target.path}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(target.path);
    const filterGroup = page.getByRole("group", {
      name: "Time range filter",
    });

    // Click 30d
    await filterGroup.getByRole("button", { name: "30d" }).click();
    await expect(page).toHaveURL(new RegExp(`range=30d`));

    // 30d should be active
    await expect(
      filterGroup.getByRole("button", { name: "30d" })
    ).toHaveAttribute("aria-pressed", "true");

    // Click 24h
    await filterGroup.getByRole("button", { name: "24h" }).click();
    await expect(page).toHaveURL(new RegExp(`range=24h`));

    expectNoConsoleErrors(errors);
  });

  test(`time filter All removes range param on ${target.path}`, async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(`${target.path}?range=30d`);
    const filterGroup = page.getByRole("group", {
      name: "Time range filter",
    });

    await filterGroup.getByRole("button", { name: "All" }).click();
    await expect(page).toHaveURL(new RegExp(`range=all`));
    await expect(
      filterGroup.getByRole("button", { name: "All" })
    ).toHaveAttribute("aria-pressed", "true");

    expectNoConsoleErrors(errors);
  });

  test(`time filter preserves state from URL on ${target.path}`, async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(`${target.path}?range=90d`);
    const filterGroup = page.getByRole("group", {
      name: "Time range filter",
    });

    await expect(
      filterGroup.getByRole("button", { name: "90d" })
    ).toHaveAttribute("aria-pressed", "true");

    expectNoConsoleErrors(errors);
  });
}

test("time filter sends start/end params to API on /trades", async ({
  page,
}) => {
  const apiCalls: string[] = [];

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    apiCalls.push(url);
    const { pathname } = new URL(url);
    const payload =
      pathname in defaultApiResponses ? defaultApiResponses[pathname] : {};
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/trades?range=24h");
  await page.waitForTimeout(500);

  const tradesCalls = apiCalls.filter((u) => u.includes("/api/trades"));
  expect(tradesCalls.length).toBeGreaterThan(0);
  const lastCall = tradesCalls[tradesCalls.length - 1];
  expect(lastCall).toContain("start=");
  expect(lastCall).toContain("end=");
});
