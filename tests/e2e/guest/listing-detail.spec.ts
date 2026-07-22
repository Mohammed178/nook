import { test, expect } from "@playwright/test";
import { ListingsPage } from "../../pages/listings-page";

test.describe("listing detail", () => {
  test("card click lands on /listings/:slug with core content", async ({
    page,
  }) => {
    const listings = new ListingsPage(page);
    await listings.goto();
    await expect(listings.cards.first()).toBeVisible();

    await listings.cards.first().click();
    await page.waitForURL(/\/listings\/[^/?]+/);

    await expect(page.locator("h1").first()).toBeVisible();
    // Price appears somewhere prominent on the detail page (RM-prefixed).
    await expect(page.getByText(/RM\s?[\d,]+/).first()).toBeVisible();

    // Recency badge in the title-row pill cluster (feature: published_at,
    // migration 0037). Day-granularity, server-computed. Exactly one pill shows:
    // the brand "Listed today" pill on day zero, else the neutral "Posted X ago"
    // pill. Seed created_at values are fixed past dates, so the seed case reads
    // "Posted N months ago"; the regex also tolerates a freshly-published today.
    // Requires migration 0037 applied + a reseed so published_at is populated.
    const posted = page
      .locator(".title-row .pill", { hasText: /Posted .* ago|Posted today|Listed today/ })
      .first();
    await expect(posted).toBeVisible();
    await expect(posted).toHaveText(/Posted .* ago|Posted today|Listed today/);
  });

  test("signed-out heart nudges sign-in instead of saving", async ({
    page,
  }) => {
    const listings = new ListingsPage(page);
    await listings.goto();
    await expect(listings.cards.first()).toBeVisible();

    const heart = page.locator(".heart-btn").first();
    await heart.click();
    // components/nook/heart-button.tsx: signed-out click opens a role=status
    // tooltip and must NOT flip aria-pressed.
    await expect(page.locator(".heart-tooltip")).toBeVisible();
    await expect(heart).toHaveAttribute("aria-pressed", "false");
  });
});
