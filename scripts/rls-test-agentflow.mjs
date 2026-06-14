// Phase F1–F5 agent-flow hardening test.
// Verifies the DB-layer invariants the agent-flow fixes rely on:
//   F1  A1, authenticated raw INSERT naming trust columns -> 42501 (the gate)
//       A2, authenticated INSERT of only the 8 granted columns -> trust columns
//            land at their DB defaults (0023), not client values
//       A3, admin approve leaves the trust columns at defaults
//       A4, authenticated INSERT naming status='approved' -> 42501 (status is
//            deliberately not granted)
//   F2  reject persists status_reason; approve clears it to null
//   F3  two live agents, same bovaep_licence -> 23505; soft-delete the first ->
//       the licence frees (partial unique index 0025)
//   F5  approve stamps verified_at; reject leaves it null
//   F4  DB precondition only, a soft-deleted-approved row stays self-readable and
//       returns deletedAt (the redirect itself is a manual smoke check; the
//       layout needs the Next runtime, same carve-out as rls-test-4a2 S1/S2/S3)
//
// Pattern carried from rls-test-4a2: anon + service-role clients, ephemeral users
// via admin.createUser/deleteUser, exact-code / post-state read-back assertions,
// deterministic teardown.
//
// PRE-REQ: migrations 0023 + 0024 (+ 0025 for F3) applied, and the omit-columns
// register action live. A1/A4 FAIL (no 42501) if 0024 is not yet applied, that
// is correct: this harness is the post-cutover gate.
//
// Run: node --experimental-strip-types --env-file=.env.local scripts/rls-test-agentflow.mjs
// Exit 0 = pass. Exit 1 = first FAIL.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

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

function uniqueLicence() {
  return `EPH-${randomUUID().slice(0, 8).toUpperCase()}`;
}
function uniqueSlug() {
  return `eph-${randomUUID().slice(0, 8)}`;
}

// The 8 columns an authenticated registrant is granted (0024) + a unique slug.
function grantedCols(userId, licence) {
  const slug = uniqueSlug();
  return {
    user_id: userId,
    slug,
    name: "Ephemeral Agent",
    agency: "Test Agency",
    phone: "+60000000000",
    whatsapp: "+60000000000",
    email: `${slug}@nook.test`,
    bovaep_licence: licence,
  };
}

// Full row for service-role seeding (bypasses the column grant).
function fullAgentRow({ id, userId, status, deletedAt = null, licence }) {
  const slug = uniqueSlug();
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
    bovaep_licence: licence,
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

async function makeEphemeralAgentSR({ status, deletedAt = null, licence = uniqueLicence() }) {
  const u = await makeEphemeralUser();
  const id = randomUUID();
  const { error } = await admin
    .from("agents")
    .insert(fullAgentRow({ id, userId: u.id, status, deletedAt, licence }));
  if (error) fail(`insert ephemeral agent (${status}): ${error.message}`);
  createdAgents.push(id);
  return { ...u, agentId: id, licence };
}

async function signedInClient(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) fail(`sign in ${email}: ${error.message}`);
  return c;
}

// Replicates app/admin/agents/actions.ts decide(): service-role guarded UPDATE
// with the F2/F5 fields. Returns the affected-row array.
async function guardedDecide({ agentId, status, reason, decidedBy }) {
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("agents")
    .update({
      status,
      status_reason: status === "rejected" ? reason : null,
      verified_at: status === "approved" ? nowIso : null,
      decided_by: decidedBy,
      decided_at: nowIso,
    })
    .eq("id", agentId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .select("id, status, status_reason, verified_at");
  if (error) fail(`guardedDecide: ${error.message}`);
  return data ?? [];
}

async function teardown() {
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
  // ── F1 ────────────────────────────────────────────────────────────────────
  step("A1, authenticated raw INSERT naming trust columns -> 42501 (THE GATE)");
  {
    const u = await makeEphemeralUser();
    const c = await signedInClient(u.email, u.password);
    const row = { ...grantedCols(u.id, uniqueLicence()), rating: 5, review_count: 9999, years_active: 30 };
    const { error } = await c.from("agents").insert(row);
    if (!error) fail("A1 injection INSERT succeeded, column grant 0024 not in force");
    if (error.code !== "42501")
      fail(`A1 expected 42501 (permission denied), got ${error.code}: ${error.message}`);
    ok(`injection denied with 42501 (${error.code})`);
  }

  step("A2, authenticated INSERT of the 8 granted columns -> trust cols = DB defaults");
  let a2UserId;
  {
    const u = await makeEphemeralUser();
    a2UserId = u.id;
    const c = await signedInClient(u.email, u.password);
    const { error } = await c.from("agents").insert(grantedCols(u.id, uniqueLicence()));
    if (error) fail(`A2 legit INSERT failed: ${error.code} ${error.message}`);

    const { data, error: re } = await admin
      .from("agents")
      .select("id, rating, review_count, response_time_mins, years_active, avatar_url, verified_at, languages, status")
      .eq("user_id", u.id)
      .maybeSingle();
    if (re || !data) fail(`A2 read-back failed: ${re?.message}`);
    createdAgents.push(data.id);
    if (Number(data.rating) !== 0) fail(`A2 rating=${data.rating}, expected 0`);
    if (data.review_count !== 0) fail(`A2 review_count=${data.review_count}, expected 0`);
    if (data.response_time_mins !== 60) fail(`A2 response_time_mins=${data.response_time_mins}, expected 60`);
    if (data.years_active !== 0) fail(`A2 years_active=${data.years_active}, expected 0`);
    if (data.avatar_url !== "/agent-placeholder.svg") fail(`A2 avatar_url=${data.avatar_url}`);
    if (data.verified_at !== null) fail(`A2 verified_at=${data.verified_at}, expected null`);
    if (JSON.stringify(data.languages) !== '["en"]') fail(`A2 languages=${JSON.stringify(data.languages)}, expected ["en"]`);
    if (data.status !== "pending") fail(`A2 status=${data.status}, expected pending`);
    ok("trust cols all at DB defaults; status=pending");
  }

  step("A3, admin approve leaves trust columns at defaults (+ F5 verified_at stamped)");
  {
    const { data: row } = await admin.from("agents").select("id").eq("user_id", a2UserId).maybeSingle();
    const seedAdminId = (await admin.auth.admin.listUsers({ page: 1, perPage: 1 })).data.users[0]?.id ?? a2UserId;
    const res = await guardedDecide({ agentId: row.id, status: "approved", reason: "", decidedBy: seedAdminId });
    if (res.length !== 1) fail(`A3 approve affected ${res.length} rows, expected 1`);
    const { data } = await admin
      .from("agents")
      .select("rating, review_count, years_active, verified_at, status")
      .eq("id", row.id)
      .maybeSingle();
    if (Number(data.rating) !== 0 || data.review_count !== 0 || data.years_active !== 0)
      fail(`A3 trust cols mutated by approve: ${JSON.stringify(data)}`);
    if (data.status !== "approved") fail(`A3 status=${data.status}, expected approved`);
    if (data.verified_at === null) fail("A3 verified_at still null after approve (F5)");
    ok("trust cols unchanged; status=approved; verified_at stamped (F5)");
  }

  step("A4, authenticated INSERT naming status='approved' -> 42501 (status not granted)");
  {
    const u = await makeEphemeralUser();
    const c = await signedInClient(u.email, u.password);
    const { error } = await c.from("agents").insert({ ...grantedCols(u.id, uniqueLicence()), status: "approved" });
    if (!error) fail("A4 status='approved' INSERT succeeded, status column should not be granted");
    if (error.code !== "42501") fail(`A4 expected 42501, got ${error.code}: ${error.message}`);
    ok(`status injection denied with 42501 (${error.code})`);
  }

  // ── F2 / F5 ─────────────────────────────────────────────────────────────────
  step("F2, reject persists status_reason; approve clears it (+ F5 verified_at)");
  {
    const seedAdminId = (await admin.auth.admin.listUsers({ page: 1, perPage: 1 })).data.users[0]?.id;
    const rej = await makeEphemeralAgentSR({ status: "pending" });
    const REASON = "Licence could not be verified against the BOVAEP registry.";
    const r = await guardedDecide({ agentId: rej.agentId, status: "rejected", reason: REASON, decidedBy: seedAdminId });
    if (r.length !== 1) fail(`F2 reject affected ${r.length} rows`);
    if (r[0].status_reason !== REASON) fail(`F2 status_reason=${r[0].status_reason}`);
    if (r[0].verified_at !== null) fail(`F2 reject set verified_at=${r[0].verified_at}, expected null`);
    ok("reject persisted status_reason; verified_at null");

    const app = await makeEphemeralAgentSR({ status: "pending" });
    const a = await guardedDecide({ agentId: app.agentId, status: "approved", reason: "", decidedBy: seedAdminId });
    if (a[0].status_reason !== null) fail(`F2 approve status_reason=${a[0].status_reason}, expected null`);
    if (a[0].verified_at === null) fail("F2 approve verified_at null (F5)");
    ok("approve cleared status_reason to null; verified_at stamped");
  }

  // ── F3 ──────────────────────────────────────────────────────────────────────
  step("F3, duplicate live licence -> 23505; soft-delete frees it");
  {
    const lic = uniqueLicence();
    const first = await makeEphemeralAgentSR({ status: "pending", licence: lic });

    const u2 = await makeEphemeralUser();
    const dupId = randomUUID();
    const { error: dupErr } = await admin
      .from("agents")
      .insert(fullAgentRow({ id: dupId, userId: u2.id, status: "pending", licence: lic }));
    if (!dupErr) {
      createdAgents.push(dupId);
      fail("F3 duplicate live licence INSERT succeeded, unique index 0025 not in force");
    }
    if (dupErr.code !== "23505") fail(`F3 expected 23505, got ${dupErr.code}: ${dupErr.message}`);
    ok(`duplicate live licence denied with 23505 (${dupErr.code})`);

    await admin.from("agents").update({ deleted_at: new Date().toISOString() }).eq("id", first.agentId);
    const freedId = randomUUID();
    const { error: freedErr } = await admin
      .from("agents")
      .insert(fullAgentRow({ id: freedId, userId: u2.id, status: "pending", licence: lic }));
    if (freedErr) fail(`F3 licence not freed after soft-delete: ${freedErr.code} ${freedErr.message}`);
    createdAgents.push(freedId);
    ok("soft-deleting the holder freed the licence for re-registration");
  }

  // ── F4 (DB precondition; redirect = manual smoke) ────────────────────────────
  step("F4, soft-deleted-approved row stays self-readable and returns deletedAt");
  {
    const sd = await makeEphemeralAgentSR({ status: "approved", deletedAt: new Date().toISOString() });
    const c = await signedInClient(sd.email, sd.password);
    const { data, error } = await c
      .from("agents")
      .select("status, deleted_at")
      .eq("user_id", sd.id)
      .maybeSingle();
    if (error || !data) fail(`F4 self-read failed: ${error?.message}`);
    if (data.status !== "approved") fail(`F4 status=${data.status}, expected approved`);
    if (data.deleted_at === null) fail("F4 deleted_at null, gate could not see the soft-delete");
    ok("row fetchable; status=approved, deleted_at present (gate has what it needs)");
  }

  console.log("\nALL PASS");
}

main()
  .then(teardown)
  .then(() => process.exit(0))
  .catch(async (e) => {
    try {
      await teardown();
    } catch {}
    console.error(`\n${e.message}`);
    process.exit(1);
  });
