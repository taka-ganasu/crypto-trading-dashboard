import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  installApiMocks,
} from "./test-utils";

test("unknown routes show custom 404 page", async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);

  await page.goto("/this-route-does-not-exist");

  await expect(page.getByRole("heading", { level: 1, name: "Page Not Found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ダッシュボードに戻る" })).toBeVisible();

  await page.getByRole("link", { name: "ダッシュボードに戻る" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
});

test("app error boundary renders fallback UI with retry button", async ({ page }) => {
  const brokenResponses = {
    ...defaultApiResponses,
    "/api/trades": { invalid: true },
  };
  await installApiMocks(page, brokenResponses);

  await page.goto("/trades");

  await expect(page.getByRole("heading", { level: 2, name: "Something went wrong" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Something went wrong" })).toBeVisible();
});
