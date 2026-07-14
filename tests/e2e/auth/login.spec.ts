import { test, expect } from "@playwright/test";
import { readSeed } from "../helpers/seed";

// Fresh contexts (no storageState): these exercise the login form itself.

test.describe("login", () => {
  test("wrong password surfaces an error, stays on /login", async ({
    page,
  }) => {
    const { creds } = readSeed();
    await page.goto("/login");
    await page.locator("#login-email").fill(creds.student.email);
    await page.locator("#login-password").fill("definitely-wrong-password");
    await page.locator("form button[type=submit]").click();

    await expect(page.locator(".auth-error")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("student lands on /account after sign-in", async ({ page }) => {
    const { creds } = readSeed();
    await page.goto("/login");
    await page.locator("#login-email").fill(creds.student.email);
    await page.locator("#login-password").fill(creds.student.password);
    await page.locator("form button[type=submit]").click();

    await page.waitForURL("**/account");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("approved agent is routed to the dashboard", async ({ page }) => {
    const { creds } = readSeed();
    await page.goto("/login");
    await page.locator("#login-email").fill(creds.agent.email);
    await page.locator("#login-password").fill(creds.agent.password);
    await page.locator("form button[type=submit]").click();

    await page.waitForURL("**/agents/dashboard", { timeout: 45_000 });
  });

  test("pending agent is walled at /agents/pending", async ({ page }) => {
    const { creds } = readSeed();
    await page.goto("/login");
    await page.locator("#login-email").fill(creds.pendingAgent.email);
    await page.locator("#login-password").fill(creds.pendingAgent.password);
    await page.locator("form button[type=submit]").click();

    await page.waitForURL("**/agents/pending");
  });
});
