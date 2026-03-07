import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const pagesWithFilter = [
  { path: "/trades", endpoint: "/api/trades" },
  { path: "/signals", endpoint: "/api/signals" },
  { path: "/performance", endpoint: "/api/performance/summary" },
];

test.beforeEach(async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
});

for (const target of pagesWithFilter) {
  test(`execution mode filter renders on ${target.path}`, async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(target.path);
    const filterGroup = page.getByRole("group", {
      name: "Execution mode filter",
    });
    await expect(filterGroup).toBeVisible();

    await expect(
      filterGroup.getByRole("button", { name: "All" })
    ).toHaveAttribute("aria-pressed", "true");

    expectNoConsoleErrors(errors);
  });

  test(`execution mode filter updates URL on ${target.path}`, async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto(target.path);
    const filterGroup = page.getByRole("group", {
      name: "Execution mode filter",
    });

    await filterGroup.getByRole("button", { name: "Live" }).click();
    await expect(page).toHaveURL(new RegExp("execution_mode=live"));
    await expect(
      filterGroup.getByRole("button", { name: "Live" })
    ).toHaveAttribute("aria-pressed", "true");

    await filterGroup.getByRole("button", { name: "Dry-run" }).click();
    await expect(page).toHaveURL(new RegExp("execution_mode=dry_run"));
    await expect(
      filterGroup.getByRole("button", { name: "Dry-run" })
    ).toHaveAttribute("aria-pressed", "true");

    await filterGroup.getByRole("button", { name: "All" }).click();
    await expect(page).not.toHaveURL(new RegExp("execution_mode="));
    await expect(
      filterGroup.getByRole("button", { name: "All" })
    ).toHaveAttribute("aria-pressed", "true");

    expectNoConsoleErrors(errors);
  });
}

for (const target of pagesWithFilter) {
  test(`execution mode sends query param to API on ${target.path}`, async ({
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

    await page.goto(`${target.path}?execution_mode=paper`);
    await page.waitForTimeout(500);

    const targetCalls = apiCalls.filter((url) => url.includes(target.endpoint));
    expect(targetCalls.length).toBeGreaterThan(0);
    expect(targetCalls.some((url) => url.includes("execution_mode=paper"))).toBeTruthy();
  });
}
