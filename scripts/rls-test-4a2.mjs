// Phase 4a-2 admin-queue invariant test.
// Verifies migration 0013 (decision audit columns), the approve/reject UPDATE
// invariants the server action relies on, the promote/demote scripts, and the
// service-role containment lint.
//
// Scope note (operator-approved, plan Q2 option a): the server action, middleware
// and layout need the Next runtime (next/headers, NextRequest, RSC) that a plain
// Node script does not provide, and importing them would drag next/headers in.
// So this harness asserts the DB-layer invariants the action enforces (the exact
// guarded UPDATE, the no-UPDATE-policy airbag, the admin claim) plus the scripts
// and lint. The middleware/layout redirects (S1/S2/S3) are manual smoke checks in
// the seal operator sequence, they are NOT faked here.
//
// Pattern carried from rls-test-4a1: anon + service-role clients, ephemeral users
// via admin.createUser/deleteUser, exact-count / post-state assertions (no error
// codes for the no-policy denials, the S2d false-pass lesson), deterministic
// teardown.
//
// Pre-req: 0010-0013 applied, `npm run seed:3ba` run (creates the seed admin).
// Run: node --experimental-strip-types --env-file=.env.local scripts/rls-test-4a2.mjs
// Exit 0 = pass. Exit 1 = first FAIL.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON,
  SUPABASE_SERVICE_ROLE_KEY: SRK,
})) {
  if (!v) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

const ADMIN_EMAIL = "admin+seed@nook.test"; // must match seed-3ba.mjs

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const FIXTURE_PATH = resolve(root, "lib/__containment-fixture.ts");
const LINT_SCRIPT = resolve(root, "scripts/lint-service-role-containment.mjs");
const PROMOTE_SCRIPT = resolve(root, "scripts/promote-to-admin.mjs");
const DEMOTE_SCRIPT = resolve(root, "scripts/demote-from-admin.mjs");

const admin = createClient(URL, SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const createdUsers = [];
const createdAgents = [];

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  throw new Error(msg);
}
function step(msg) {
  console.log(`\n→ ${msg}`);
}
function ok(msg) {
  console.log(`  ${msg}`);
}

function fullAgentRow({ id, userId, slug, status, deletedAt = null }) {
  return {
    id,
    user_id: userId,
    slug,
    name: "Ephemeral Agent",
    agency: "Test Agency",
    rating: 0,
    review_count: 0,
    response_time_mins: 60,
    languages: ["en"],
    avatar_url: "/agent-placeholder.svg",
    whatsapp: "+60000000000",
    phone: "+60000000000",
    email: `${slug}@nook.test`,
    bovaep_licence: "EPH-TEST",
    years_active: 0,
    status,
    deleted_at: deletedAt,
  };
}

async function makeEphemeralUser() {
  const email = `ephemeral-${randomUUID()}@nook.test`;
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data?.user) fail(`createUser: ${error?.message}`);
  createdUsers.push(data.user.id);
  return { id: data.user.id, email, password };
}

async function makeEphemeralAgent({ status, deletedAt = null }) {
  const u = await makeEphemeralUser();
  const id = randomUUID();
  const { error } = await admin
    .from("agents")
    .insert(fullAgentRow({ id, userId: u.id, slug: `eph-${id.slice(0, 8)}`, status, deletedAt }));
  if (error) fail(`insert ephemeral agent (${status}): ${error.message}`);
  createdAgents.push(id);
  return { ...u, agentId: id };
}

async function signedInClient(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) fail(`sign in ${email}: ${error.message}`);
  return c;
}

async function findUserByEmail(target) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email === target);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
}

// Replicates the server action's privileged write (app/admin/agents/actions.ts):
// service-role guarded UPDATE. Returns affected-row array length + the row.
async function guardedDecide({ agentId, status, decidedBy, decidedAt }) {
  const { data, error } = await admin
    .from("agents")
    .update({ status, decided_by: decidedBy, decided_at: decidedAt })
    .eq("id", agentId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .select("id, status, decided_by, decided_at");
  if (error) fail(`guardedDecide: ${error.message}`);
  return data ?? [];
}

function runScript(scriptPath, args) {
  return spawnSync("node", ["--experimental-strip-types", scriptPath, ...args], {
    encoding: "utf8",
    cwd: root,
    env: process.env,
  });
}

async function teardown() {
  rmSync(FIXTURE_PATH, { force: true });
  for (const id of createdAgents) {
    try {
      await admin.from("agents").delete().eq("id", id);
    } catch {}
  }
  for (const uid of createdUsers) {
    try {
      await admin.auth.admin.deleteUser(uid);
    } catch {}
  }
}

async function main() {
  step("S0, seed admin exists with app_metadata.role='admin'");
  const seedAdmin = await findUserByEmail(ADMIN_EMAIL);
  if (!seedAdmin) fail(`S0 seed admin ${ADMIN_EMAIL} not found, run npm run seed:3ba`);
  if (seedAdmin.app_metadata?.role !== "admin")
    fail(`S0 seed admin role is '${seedAdmin.app_metadata?.role}', expected 'admin'`);
  const adminUid = seedAdmin.id;
  ok(`seed admin present, role=admin (${adminUid})`);

  step("S0b, backfill: 6 decided agents have non-null decision fields, 0 pending do");
  {
    const { data: decided, error: de } = await admin
      .from("agents")
      .select("id, status, decided_by, decided_at")
      .neq("status", "pending");
    if (de) fail(`S0b decided select: ${de.message}`);
    if (decided.length !== 6) fail(`S0b expected 6 decided seed agents, got ${decided.length}`);
    for (const r of decided) {
      if (!r.decided_by) fail(`S0b agent ${r.id} (${r.status}) has null decided_by`);
      if (!r.decided_at) fail(`S0b agent ${r.id} (${r.status}) has null decided_at`);
    }
    const { data: pending, error: pe } = await admin
      .from("agents")
      .select("id, decided_by, decided_at")
      .eq("status", "pending");
    if (pe) fail(`S0b pending select: ${pe.message}`);
    for (const r of pending) {
      if (r.decided_by !== null || r.decided_at !== null)
        fail(`S0b pending agent ${r.id} has non-null decision fields`);
    }
    ok(`6 decided seed agents populated; ${pending.length} pending agent(s) all null`);
  }

  step("H1, non-admin cannot effect approve/reject (claim absent + DB airbag)");
  {
    const target = await makeEphemeralAgent({ status: "pending" });
    const nonAdmin = await makeEphemeralUser();
    const c = await signedInClient(nonAdmin.email, nonAdmin.password);
    // (a) the value the action's isAdmin() gates on
    const { data: { user } } = await c.auth.getUser();
    if (user?.app_metadata?.role === "admin") fail("H1 non-admin carries admin claim");
    // (b) DB airbag: no agents UPDATE policy → the action's UPDATE affects 0 rows
    const { data: upd } = await c
      .from("agents")
      .update({ status: "approved", decided_by: nonAdmin.id, decided_at: new Date().toISOString() })
      .eq("id", target.agentId)
      .eq("status", "pending")
      .is("deleted_at", null)
      .select();
    if ((upd?.length ?? 0) !== 0) fail(`H1 non-admin UPDATE affected ${upd.length} row(s)`);
    const { data: rb } = await admin
      .from("agents")
      .select("status, decided_at")
      .eq("id", target.agentId)
      .single();
    if (rb.status !== "pending") fail(`H1 status changed to '${rb.status}'`);
    if (rb.decided_at !== null) fail("H1 decided_at populated by non-admin");
    ok("claim absent; UPDATE affected 0 rows; status still pending, decided_at null");
  }

  step("H2, admin approve: pending → approved + decision fields populated");
  {
    const target = await makeEphemeralAgent({ status: "pending" });
    const at = new Date().toISOString();
    const rows = await guardedDecide({ agentId: target.agentId, status: "approved", decidedBy: adminUid, decidedAt: at });
    if (rows.length !== 1) fail(`H2 expected 1 row updated, got ${rows.length}`);
    if (rows[0].status !== "approved") fail(`H2 status '${rows[0].status}'`);
    if (rows[0].decided_by !== adminUid) fail(`H2 decided_by '${rows[0].decided_by}'`);
    if (!rows[0].decided_at) fail("H2 decided_at null");
    ok("status approved; decided_by = admin uid; decided_at set");
  }

  step("H3, admin reject: pending → rejected + decision fields populated");
  {
    const target = await makeEphemeralAgent({ status: "pending" });
    const at = new Date().toISOString();
    const rows = await guardedDecide({ agentId: target.agentId, status: "rejected", decidedBy: adminUid, decidedAt: at });
    if (rows.length !== 1) fail(`H3 expected 1 row updated, got ${rows.length}`);
    if (rows[0].status !== "rejected") fail(`H3 status '${rows[0].status}'`);
    if (rows[0].decided_by !== adminUid) fail(`H3 decided_by '${rows[0].decided_by}'`);
    if (!rows[0].decided_at) fail("H3 decided_at null");
    ok("status rejected; decision fields populated");
  }

  step("H4, re-decide is a no-op (status guard); decided_at unchanged");
  {
    const target = await makeEphemeralAgent({ status: "pending" });
    const at1 = "2026-03-01T00:00:00.000Z";
    const r1 = await guardedDecide({ agentId: target.agentId, status: "approved", decidedBy: adminUid, decidedAt: at1 });
    if (r1.length !== 1) fail(`H4 first decide affected ${r1.length} rows`);
    const at2 = "2026-04-01T00:00:00.000Z";
    const r2 = await guardedDecide({ agentId: target.agentId, status: "approved", decidedBy: adminUid, decidedAt: at2 });
    if (r2.length !== 0) fail(`H4 second decide affected ${r2.length} rows (status guard failed)`);
    const { data: rb } = await admin
      .from("agents")
      .select("decided_at")
      .eq("id", target.agentId)
      .single();
    // Compare instants, not strings: Postgres serializes timestamptz as
    // ...+00:00 while JS toISOString() emits ...000Z, same moment, different text.
    if (new Date(rb.decided_at).getTime() !== new Date(at1).getTime())
      fail(`H4 decided_at changed to '${rb.decided_at}', expected ${at1}`);
    ok("second decide affected 0 rows; decided_at unchanged");
  }

  step("H5, deciding a soft-deleted agent is a no-op (deleted_at guard)");
  {
    const target = await makeEphemeralAgent({ status: "pending", deletedAt: new Date().toISOString() });
    const rows = await guardedDecide({ agentId: target.agentId, status: "approved", decidedBy: adminUid, decidedAt: new Date().toISOString() });
    if (rows.length !== 0) fail(`H5 soft-deleted decide affected ${rows.length} rows`);
    const { data: rb } = await admin
      .from("agents")
      .select("status, decided_at")
      .eq("id", target.agentId)
      .single();
    if (rb.status !== "pending") fail(`H5 status changed to '${rb.status}'`);
    if (rb.decided_at !== null) fail("H5 decided_at populated on soft-deleted agent");
    ok("0 rows; soft-deleted agent stays pending, decided_at null");
  }

  console.log("\n→ S1/S2/S3, middleware + layout gating: MANUAL smoke (see seal operator sequence). Not asserted here (no HTTP/RSC harness; no new dependency).");

  step("S4, promote-to-admin flips role and is idempotent");
  {
    const u = await makeEphemeralUser();
    const r1 = runScript(PROMOTE_SCRIPT, [u.email]);
    if (r1.status !== 0) fail(`S4 promote exited ${r1.status}: ${r1.stderr}`);
    const after1 = await admin.auth.admin.getUserById(u.id);
    if (after1.data.user?.app_metadata?.role !== "admin") fail("S4 role not 'admin' after promote");
    const r2 = runScript(PROMOTE_SCRIPT, [u.email]);
    if (r2.status !== 0) fail(`S4 second promote exited ${r2.status}: ${r2.stderr}`);
    if (!/already admin/i.test(r2.stdout)) fail(`S4 second promote not a no-op: ${r2.stdout}`);
    const after2 = await admin.auth.admin.getUserById(u.id);
    if (after2.data.user?.app_metadata?.role !== "admin") fail("S4 role lost after second promote");
    ok("role=admin after promote; second run idempotent no-op");
  }

  step("S5, demote-from-admin clears role and is idempotent");
  {
    const u = await makeEphemeralUser();
    const p = runScript(PROMOTE_SCRIPT, [u.email]);
    if (p.status !== 0) fail(`S5 setup promote exited ${p.status}: ${p.stderr}`);
    const d1 = runScript(DEMOTE_SCRIPT, [u.email]);
    if (d1.status !== 0) fail(`S5 demote exited ${d1.status}: ${d1.stderr}`);
    const after1 = await admin.auth.admin.getUserById(u.id);
    if (after1.data.user?.app_metadata?.role === "admin") fail("S5 still admin after demote");
    const d2 = runScript(DEMOTE_SCRIPT, [u.email]);
    if (d2.status !== 0) fail(`S5 second demote exited ${d2.status}: ${d2.stderr}`);
    if (!/not an admin/i.test(d2.stdout)) fail(`S5 second demote not a no-op: ${d2.stdout}`);
    ok("role cleared after demote; second run idempotent no-op");
  }

  step("S6, lint:service-role-containment fails on import outside app/admin/");
  {
    writeFileSync(
      FIXTURE_PATH,
      'import { createAdminClient } from "@/lib/supabase/admin";\nexport const _leak = createAdminClient;\n',
      "utf8",
    );
    const withLeak = runScript(LINT_SCRIPT, []);
    if (withLeak.status === 0) fail("S6 lint passed despite an out-of-app/admin import");
    if (withLeak.status !== 1) fail(`S6 lint errored (status ${withLeak.status}): ${withLeak.stderr}`);
    rmSync(FIXTURE_PATH, { force: true });
    const clean = runScript(LINT_SCRIPT, []);
    if (clean.status !== 0) fail(`S6 lint failed on a clean tree (status ${clean.status}): ${clean.stderr}`);
    ok("lint exit 1 with fixture, exit 0 without");
  }

  console.log("\nrls-test-4a2 PASSED");
}

try {
  await main();
  await teardown();
  process.exit(0);
} catch (err) {
  await teardown();
  console.error(err?.message ?? err);
  process.exit(1);
}
