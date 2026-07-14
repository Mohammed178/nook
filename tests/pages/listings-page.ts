import type { Locator, Page } from "@playwright/test";

/**
 * Page object for /listings. Card markup lives in
 * components/nook/listing-card.tsx: every variant is an <a class="card ...">
 * whose price sits in .card-price-amt (tabular numbers, "RM 1,200" style).
 */
export class ListingsPage {
  readonly page: Page;
  readonly cards: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cards = page.locator("a.card");
    this.emptyState = page.locator(".empty-state");
  }

  async goto(query = "") {
    await this.page.goto(query ? `/listings?${query}` : "/listings");
  }

  /** Monthly prices of every rendered card, in DOM order. */
  async cardPrices(): Promise<number[]> {
    const texts = await this.page
      .locator("a.card .card-price-amt")
      .allTextContents();
    return texts
      .map((t) => Number(t.replace(/[^\d]/g, "")))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  async firstCardTitle(): Promise<string> {
    return (await this.cards.first().locator(".card-title").innerText()).trim();
  }
}
