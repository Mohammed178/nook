import { test, expect, type Page } from "@playwright/test";
import { STORAGE_STATE } from "../helpers/seed";
import { ListingsPage } from "../../pages/listings-page";

test.use({ storageState: STORAGE_STATE.student });

/**
 * Click the heart and wait for toggleFavouriteAction's POST to complete, so
 * the row is committed before the test navigates away (the button state is
 * optimistic and flips before the server confirms).
 */
async function toggleHeartAndSettle(page: Page) {
  const heart = page.locator(".heart-btn").first();
  const actionDone = page.waitForResponse(
    (resp) => resp.request().method() === "POST",
    { timeout: 15_000 },
  );
  await heart.click();
  await actionDone;
  return heart;
}

// Serial: save → verify → unsave mutate the same favourites row.
test.describe.serial("saved listings", () => {
  test("heart saves a listing and it appears under /account/saved", async ({
    page,
  }) => {
    const listings = new ListingsPage(page);
    await listings.goto("sort=priceAsc");
    await expect(listings.cards.first()).toBeVisible();
    const savedTitle = await listings.firstCardTitle();

    await expect(page.locator(".heart-btn").first()).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    const heart = await toggleHeartAndSettle(page);
    await expect(heart).toHaveAttribute("aria-pressed", "true");

    await page.goto("/account/saved");
    await expect(page.getByText(savedTitle).first()).toBeVisible();
  });

  test("unsave removes it from /account/saved", async ({ page }) => {
    const listings = new ListingsPage(page);
    await listings.goto("sort=priceAsc");
    await expect(listings.cards.first()).toBeVisible();
    const savedTitle = await listings.firstCardTitle();

    await expect(page.locator(".heart-btn").first()).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const heart = await toggleHeartAndSettle(page);
    await expect(heart).toHaveAttribute("aria-pressed", "false");

    await page.goto("/account/saved");
    await expect(page.getByText(savedTitle)).toHaveCount(0);
  });
});
