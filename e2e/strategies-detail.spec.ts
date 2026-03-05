import { expect, test, type Page } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  nullSafeApiResponses,
  trackConsoleErrors,
} from "./test-utils";

const detailedStrategies = [
  {
    strategy: "zenith_trend",
    trade_count: 22,
    win_rate: 0.82,
    profit_factor: 1.55,
    sharpe: 1.1,
    avg_pnl: 42.3,
    max_dd: 110,
  },
  {
    strategy: "beta_revert",
    trade_count: 19,
    win_rate: 0.41,
    profit_factor: 0.93,
    sharpe: 0.25,
    avg_pnl: -5.4,
    max_dd: 180,
  },
  {
    strategy: "gamma_pulse",
    trade_count: 31,
    win_rate: 0.67,
    profit_factor: 1.95,
    sharpe: 0.88,
    avg_pnl: 28.9,
    max_dd: 125,
  },
  {
    strategy: "delta_mean",
    trade_count: 16,
    win_rate: 0.58,
    profit_factor: 1.42,
    sharpe: 1.73,
    avg_pnl: 19.7,
    max_dd: 98,
  },
  {
    strategy: "epsilon_break",
    trade_count: 27,
    win_rate: 0.49,
    profit_factor: 1.01,
    sharpe: 0.52,
    avg_pnl: 6.2,
    max_dd: 150,
  },
  {
    strategy: "theta_grid",
    trade_count: 24,
    win_rate: 0.75,
    profit_factor: 1.22,
    sharpe: 0.77,
    avg_pnl: 17.8,
    max_dd: 140,
  },
  {
    strategy: "omega_null",
    trade_count: 8,
    win_rate: null,
    profit_factor: null,
    sharpe: null,
    avg_pnl: null,
    max_dd: null,
  },
];

const strategiesDetailResponses = {
  ...defaultApiResponses,
  "/api/performance/by-strategy": detailedStrategies,
};

async function firstStrategyInTable(page: Page): Promise<string> {
  const firstCell = page.locator("tbody tr").first().locator("td").first();
  await expect(firstCell).toBeVisible();
  return (await firstCell.textContent())?.trim() ?? "";
}

async function sortByColumn(page: Page, label: "Win Rate" | "Profit Factor" | "Sharpe") {
  await page
    .getByRole("columnheader", { name: label })
    .getByRole("button", { name: label })
    .click();
}

test.describe("Strategies detail page", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, strategiesDetailResponses);
  });

  test("renders seven strategy cards and opens DetailPanel from card click", async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");

    await expect(
      page.getByRole("heading", { level: 1, name: "Strategies" })
    ).toBeVisible();
    await expect(page.getByText("7 strategies")).toBeVisible();

    const cardGrid = page.locator("div.mb-8.grid").first();
    await expect(cardGrid.getByRole("button")).toHaveCount(7);

    await cardGrid.getByRole("button", { name: /gamma_pulse/ }).click();
    const dialog = page.getByRole("dialog", { name: "Strategy Details" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Strategy", { exact: true })).toBeVisible();
    await expect(dialog.getByText("gamma_pulse")).toBeVisible();
    await expect(dialog.getByText("Sharpe Ratio")).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("table row opens DetailPanel with null fallback values", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");
    await page.getByRole("row", { name: /omega_null/ }).click();

    const dialog = page.getByRole("dialog", { name: "Strategy Details" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("omega_null")).toBeVisible();
    await expect(dialog.getByText("Win Rate")).toBeVisible();
    await expect(dialog.getByText("Profit Factor")).toBeVisible();
    await expect(dialog.getByText("Sharpe Ratio")).toBeVisible();
    await expect(dialog.getByText("—").first()).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("sorts table by Win Rate, Profit Factor, and Sharpe", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/strategies");

    await sortByColumn(page, "Win Rate");
    await expect(await firstStrategyInTable(page)).toBe("zenith_trend");

    await sortByColumn(page, "Win Rate");
    await expect(await firstStrategyInTable(page)).toBe("beta_revert");

    await sortByColumn(page, "Profit Factor");
    await expect(await firstStrategyInTable(page)).toBe("gamma_pulse");

    await sortByColumn(page, "Sharpe");
    await expect(await firstStrategyInTable(page)).toBe("delta_mean");

    expectNoConsoleErrors(errors);
  });
});

test("renders empty-state fallback when strategy data is empty", async ({ page }) => {
  await installApiMocks(page, nullSafeApiResponses);
  const errors = trackConsoleErrors(page);

  await page.goto("/strategies");

  await expect(page.getByText("0 strategies")).toBeVisible();
  await expect(page.getByText("No strategy data available")).toBeVisible();

  expectNoConsoleErrors(errors);
});
