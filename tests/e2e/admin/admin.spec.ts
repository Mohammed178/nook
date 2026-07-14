import { test, expect } from "@playwright/test";
import { STORAGE_STATE } from "../helpers/seed";

// Admin gating contract (middleware.ts L-4a2.12, layer 1 of defence-in-depth):
// signed-out → redirect to /login?redirect=..., authenticated non-admin →
// redirect home. The admin layout's notFound() is the deeper layer and only
// fires if middleware is bypassed, so a browser-level test asserts redirects.

test.describe("admin access", () => {
  test("admin reaches /admin", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: STORAGE_STATE.admin,
    });
    const page = await context.newPage();
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe("/admin");
    await expect(page.locator("h1").first()).toBeVisible();
    await context.close();
  });

  test("student is bounced home from /admin", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: STORAGE_STATE.student,
    });
    const page = await context.newPage();
    await page.goto("/admin");
    expect(new URL(page.url()).pathname).toBe("/");
    await context.close();
  });

  test("signed-out visitor is sent to /login with a redirect param", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/admin");
    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirect")).toBe("/admin");
    await context.close();
  });
});
