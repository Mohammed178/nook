import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { STORAGE_STATE } from "../helpers/seed";

test.use({ storageState: STORAGE_STATE.agent });

test.describe("agent dashboard", () => {
  test("dashboard loads for an approved agent", async ({ page }) => {
    await page.goto("/agents/dashboard");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("create listing: form → edit page → visible on dashboard", async ({
    page,
  }) => {
    const title = `E2E Draft ${randomUUID().slice(0, 8)}`;

    await page.goto("/agents/dashboard/listings/new");
    await page.locator("#lf-title").fill(title);
    await page.locator("#lf-type").selectOption("room");
    await page
      .locator("#lf-description")
      .fill(
        "Ephemeral E2E test listing. Created by the Playwright suite and deleted by its teardown.",
      );
    await page.locator("#lf-price").fill("999");
    await page.locator("#lf-deposit").fill("999");
    await page.locator("#lf-bedrooms").fill("1");
    await page.locator("#lf-bathrooms").fill("1");
    await page.locator("#lf-furnishing").selectOption("partial");
    await page.locator("#lf-available").fill("2026-09-01");
    await page.locator("#lf-address").fill("1 Test Street, E2E");
    // First real option; index 0 is the disabled "Choose an area" placeholder.
    await page.locator("#lf-area").selectOption({ index: 1 });
    await page.locator("#lf-city").fill("Kuala Lumpur");
    await page.locator("#lf-state").fill("Kuala Lumpur");

    // The account shell also renders a sign-out <form>; scope to the listing
    // form to avoid a strict-mode collision.
    await page.locator("form:has(#lf-title) button[type=submit]").click();

    // components/agents/listing-form.tsx: create redirects to the edit page
    // (that's where photos are added); a validation miss re-renders in place
    // with role=alert errors instead.
    await page.waitForURL(/\/agents\/dashboard\/listings\/[^/]+\/edit/, {
      timeout: 45_000,
    });

    await page.goto("/agents/dashboard");
    await expect(page.getByText(title).first()).toBeVisible();
  });

  test("pending agent cannot reach the dashboard", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: STORAGE_STATE.pendingAgent,
    });
    const page = await context.newPage();
    await page.goto("/agents/dashboard");
    await page.waitForURL("**/agents/pending");
    await context.close();
  });
});
