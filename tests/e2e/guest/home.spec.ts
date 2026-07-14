import { test, expect } from "@playwright/test";

test.describe("home page", () => {
  test("renders and links to listings", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();

    // On phones the header nav collapses behind a hamburger; pick whichever
    // /listings link is actually visible (e.g. the featured rail's "see all").
    const listingsLink = page
      .locator('a[href^="/listings"]')
      .filter({ visible: true })
      .first();
    await expect(listingsLink).toBeVisible();
    await listingsLink.click();
    await page.waitForURL("**/listings**");
  });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    // Allow 1px of sub-pixel rounding; anything more is a real overflow.
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
