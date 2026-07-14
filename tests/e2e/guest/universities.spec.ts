import { test, expect } from "@playwright/test";

test.describe("universities", () => {
  test("index lists campuses and detail page opens", async ({ page }) => {
    await page.goto("/universities");
    await expect(page.locator("h1").first()).toBeVisible();

    const uniLinks = page.locator('a[href^="/universities/"]');
    expect(await uniLinks.count()).toBeGreaterThan(0);

    await uniLinks.first().click();
    await page.waitForURL(/\/universities\/[^/?]+/);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/universities");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
