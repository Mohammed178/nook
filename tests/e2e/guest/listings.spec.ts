import { test, expect } from "@playwright/test";
import { ListingsPage } from "../../pages/listings-page";

// URL filter contract (lib/listings-search.ts): priceMin/priceMax are hard
// bounds on priceMonthly, q is free-text over title/address/description,
// view=map is presentation-only. Gender is profile-driven and never URL-borne,
// so it is covered by the auth specs, not here.

test.describe("listings browse and filter contract", () => {
  let listings: ListingsPage;

  test.beforeEach(async ({ page }) => {
    listings = new ListingsPage(page);
  });

  test("unfiltered browse renders cards", async () => {
    await listings.goto();
    await expect(listings.cards.first()).toBeVisible();
    expect(await listings.cards.count()).toBeGreaterThan(0);
  });

  test("priceMax is a hard upper bound", async () => {
    await listings.goto();
    await expect(listings.cards.first()).toBeVisible();
    const all = await listings.cardPrices();
    expect(all.length).toBeGreaterThan(0);

    // Pick a cap that keeps at least one listing, derived from live data so
    // the test doesn't depend on a specific seed set.
    const cap = [...all].sort((a, b) => a - b)[Math.floor(all.length / 2)];

    await listings.goto(`priceMax=${cap}`);
    await expect(listings.cards.first()).toBeVisible();
    const filtered = await listings.cardPrices();
    expect(filtered.length).toBeGreaterThan(0);
    for (const price of filtered) expect(price).toBeLessThanOrEqual(cap);
  });

  test("priceMin is a hard lower bound", async () => {
    await listings.goto();
    await expect(listings.cards.first()).toBeVisible();
    const all = await listings.cardPrices();
    const floor = [...all].sort((a, b) => a - b)[Math.floor(all.length / 2)];

    await listings.goto(`priceMin=${floor}`);
    await expect(listings.cards.first()).toBeVisible();
    for (const price of await listings.cardPrices()) {
      expect(price).toBeGreaterThanOrEqual(floor);
    }
  });

  test("sort=priceAsc orders cards by ascending price", async () => {
    await listings.goto("sort=priceAsc");
    await expect(listings.cards.first()).toBeVisible();
    const prices = await listings.cardPrices();
    expect(prices.length).toBeGreaterThan(1);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  test("q free-text filter returns matching listings", async () => {
    await listings.goto();
    await expect(listings.cards.first()).toBeVisible();
    const title = await listings.firstCardTitle();
    const word = title.split(/\s+/).find((w) => w.length > 3) ?? title;

    await listings.goto(`q=${encodeURIComponent(word)}`);
    await expect(listings.cards.first()).toBeVisible();
    expect(await listings.cards.count()).toBeGreaterThan(0);
  });

  test("nonsense q shows empty state with a clear-filters escape", async () => {
    await listings.goto("q=xyznonexistent123");
    await expect(listings.emptyState).toBeVisible();
    expect(await listings.cards.count()).toBe(0);

    await listings.emptyState.locator('a[href^="/listings"]').click();
    await expect(listings.cards.first()).toBeVisible();
  });

  test("view=map renders the map-only pane", async ({ page }) => {
    await listings.goto("view=map");
    await expect(page.locator(".body-maponly")).toBeVisible();
  });
});
