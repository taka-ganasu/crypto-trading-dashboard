import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

test.describe("System page go-live widget", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page, defaultApiResponses);
  });

  test("renders go-live progress summary", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/system");

    await expect(
      page.getByRole("heading", { level: 1, name: "System" })
    ).toBeVisible();

    const widget = page.getByTestId("go-live-widget");
    await expect(widget).toBeVisible();
    await expect(widget.getByRole("heading", { name: "Go-Live Progress" })).toBeVisible();
    await expect(widget.getByText("75% (9/12)")).toBeVisible();

    await expect(
      widget.getByText("Remaining blockers: testnet:false切替（殿判断）、systemd設定、Slack")
    ).toBeVisible();

    expectNoConsoleErrors(errors);
  });

  test("renders all 12 checklist items including incomplete tasks", async ({ page }) => {
    const errors = trackConsoleErrors(page);

    await page.goto("/system");

    const checklistItems = page.getByTestId("go-live-item");
    await expect(checklistItems).toHaveCount(12);

    await expect(page.getByText("10. testnet:false切替")).toBeVisible();
    await expect(page.getByText("11. systemd設定")).toBeVisible();
    await expect(page.getByText("12. Slack通知設定")).toBeVisible();
    await expect(page.getByText("殿判断待ち")).toBeVisible();

    expectNoConsoleErrors(errors);
  });
});
