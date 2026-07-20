import { test, expect } from "@playwright/test";

// University onboarding (migration 0036). The full journey — register → pending
// outreach copy → admin approve with note → dashboard → publish an on-campus
// listing → guest sees the university pill + "On campus" — needs a seeded
// university-lister storage state that global.setup does not yet create, so that
// end-to-end flow is captured as a fixme below. These active tests cover the
// guest-reachable surface that needs no seeded account.

test.describe("university onboarding — public surface", () => {
  test("registration page renders the university-specific form", async ({ page }) => {
    await page.goto("/universities/register");
    // University picker + the fields that distinguish this from the agent form.
    await expect(page.locator("#uni-id")).toBeVisible();
    await expect(page.locator("#uni-contact-name")).toBeVisible();
    await expect(page.locator("#uni-contact-role")).toBeVisible();
    await expect(page.locator("#uni-notes")).toBeVisible();
    // No BOVAEP licence field anywhere on the university form.
    await expect(page.locator("#agent-bovaep")).toHaveCount(0);
  });

  test("submitting the empty form surfaces a validation error", async ({ page }) => {
    await page.goto("/universities/register");
    await page.locator("form:has(#uni-id) button[type=submit]").click();
    await expect(page.locator(".auth-error")).toBeVisible();
  });

  test("agent register page cross-links to the university flow", async ({ page }) => {
    await page.goto("/agents/register");
    const link = page.getByRole("link", { name: /university/i });
    await expect(link.first()).toBeVisible();
    await expect(link.first()).toHaveAttribute("href", "/universities/register");
  });
});

// Full journey — requires a seeded approved university-lister storage state
// (STORAGE_STATE.university) plus a pending one. Enable once global.setup seeds
// those, mirroring the agent/pendingAgent states.
test.fixme(
  "university journey: register → pending outreach copy → approve → publish on-campus → guest sees pill",
  async () => {
    // 1. register a university (no verify stepper; lands on /agents/pending)
    // 2. /agents/pending shows the outreach copy, NO verify chips
    // 3. admin approves with a required outreach note (ApproveUniversityDialog)
    // 4. dashboard → new listing with the on-campus toggle ticked (no address)
    // 5. guest listing card + detail show pill-university + "On campus · {uni}"
    // 6. negative: a second application for the same university errors;
    //    an agent submitting on_campus=true is rejected server-side.
  },
);
