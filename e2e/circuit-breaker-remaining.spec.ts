import { expect, test } from "@playwright/test";
import {
  defaultApiResponses,
  expectNoConsoleErrors,
  installApiMocks,
  trackConsoleErrors,
} from "./test-utils";

const statusCases = [
  {
    status: "WARNING",
    description:
      "Consecutive loss threshold reached. Leverage reduced automatically.",
  },
  {
    status: "PAUSED",
    description:
      "Further losses detected. Positions reduced by 50% and new trades halted.",
  },
  {
    status: "STOPPED",
    description:
      "Critical threshold exceeded. All positions closed and system shut down. Manual restart required.",
  },
] as const;

for (const statusCase of statusCases) {
  test(`renders ${statusCase.status} status view and event badge`, async ({
    page,
  }) => {
    const errors = trackConsoleErrors(page);

    const cbWithStatus = {
      ...defaultApiResponses,
      "/api/cb/state": {
        data: {
          status: statusCase.status,
          recent_events: [
            {
              status: statusCase.status,
              message: `${statusCase.status} state entered`,
              timestamp: "2026-01-01T12:00:00Z",
            },
          ],
        },
      },
    };

    await installApiMocks(page, cbWithStatus);

    await page.goto("/circuit-breaker");

    await expect(
      page.getByRole("heading", { level: 1, name: "Circuit Breaker" })
    ).toBeVisible();
    await expect(page.getByText(statusCase.status).first()).toBeVisible();
    await expect(page.getByText(statusCase.description)).toBeVisible();
    await expect(page.getByText(`${statusCase.status} state entered`)).toBeVisible();

    expectNoConsoleErrors(errors);
  });
}

test("renders all transition actions for level changes", async ({ page }) => {
  await installApiMocks(page, defaultApiResponses);
  const errors = trackConsoleErrors(page);

  await page.goto("/circuit-breaker");

  const transitionActions = [
    "Leverage is automatically reduced",
    "Positions reduced by 50%, new trades halted",
    "All positions closed, system shutdown",
    "Leverage restored (75% → 100%)",
    "New trades re-enabled at reduced leverage",
  ];

  for (const action of transitionActions) {
    await expect(page.getByText(action)).toBeVisible();
  }

  expectNoConsoleErrors(errors);
});
