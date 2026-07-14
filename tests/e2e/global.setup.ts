import { test as setup, type Browser } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { adminClient } from "./helpers/supabase-admin";
import { STORAGE_STATE, writeSeed, type SeedCreds } from "./helpers/seed";

// Seeds four ephemeral auth users (student, approved agent, pending agent,
// admin) via the service role — same ephemeral-user pattern as
// scripts/rls-test-agentflow.mjs — then signs each in through the real /login
// form and captures per-role storageState. global.teardown.ts deletes it all.

const admin = adminClient();

function uniqueSlug() {
  return `e2e-${randomUUID().slice(0, 8)}`;
}

// Full agents row for service-role seeding (bypasses the 0024 column grant),
// mirroring fullAgentRow in scripts/rls-test-agentflow.mjs.
function fullAgentRow(userId: string, status: "approved" | "pending") {
  const slug = uniqueSlug();
  return {
    id: randomUUID(),
    user_id: userId,
    slug,
    name: "E2E Test Agent",
    agency: "E2E Test Agency",
    rating: 5,
    review_count: 0,
    response_time_mins: 60,
    languages: ["en"],
    avatar_url: "/agent-placeholder.svg",
    whatsapp: "+60000000000",
    phone: "+60000000000",
    email: `${slug}@nook.test`,
    bovaep_licence: `E2E-${randomUUID().slice(0, 8).toUpperCase()}`,
    years_active: 1,
    status,
    verified_at: status === "approved" ? new Date().toISOString() : null,
    deleted_at: null,
  };
}

setup("seed ephemeral users and capture auth states", async ({ browser }) => {
  setup.setTimeout(180_000);

  const userIds: string[] = [];
  const agentIds: string[] = [];

  async function createUser(role?: "admin"): Promise<SeedCreds & { id: string }> {
    const email = `e2e-${randomUUID()}@nook.test`;
    const password = `E2e-${randomUUID()}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      // Set the admin claim at creation so the very first JWT carries it
      // (LOCK-4.10: a JWT minted before promotion lacks the claim).
      ...(role === "admin" ? { app_metadata: { role: "admin" } } : {}),
    });
    if (error || !data?.user) throw new Error(`createUser: ${error?.message}`);
    userIds.push(data.user.id);
    return { id: data.user.id, email, password };
  }

  const student = await createUser();
  const adminUser = await createUser("admin");
  const agentUser = await createUser();
  const pendingAgentUser = await createUser();

  for (const [user, status] of [
    [agentUser, "approved"],
    [pendingAgentUser, "pending"],
  ] as const) {
    const row = fullAgentRow(user.id, status);
    const { error } = await admin.from("agents").insert(row);
    if (error) throw new Error(`insert agent (${status}): ${error.message}`);
    agentIds.push(row.id);
  }

  // Persist BEFORE the UI sign-ins so teardown can clean up even if a
  // sign-in below fails.
  writeSeed({
    userIds,
    agentIds,
    creds: {
      student: { email: student.email, password: student.password },
      agent: { email: agentUser.email, password: agentUser.password },
      pendingAgent: {
        email: pendingAgentUser.email,
        password: pendingAgentUser.password,
      },
      admin: { email: adminUser.email, password: adminUser.password },
    },
  });

  async function captureAuthState(
    b: Browser,
    creds: SeedCreds,
    landingUrl: string | RegExp,
    statePath: string,
  ) {
    const context = await b.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await page.locator("#login-email").fill(creds.email);
    await page.locator("#login-password").fill(creds.password);
    await page.locator("form button[type=submit]").click();
    await page.waitForURL(landingUrl, { timeout: 30_000 });
    await context.storageState({ path: statePath });
    await context.close();
  }

  await captureAuthState(browser, student, "**/account", STORAGE_STATE.student);
  await captureAuthState(browser, adminUser, "**/account", STORAGE_STATE.admin);
  await captureAuthState(
    browser,
    agentUser,
    "**/agents/dashboard",
    STORAGE_STATE.agent,
  );
  await captureAuthState(
    browser,
    pendingAgentUser,
    "**/agents/pending",
    STORAGE_STATE.pendingAgent,
  );
});
