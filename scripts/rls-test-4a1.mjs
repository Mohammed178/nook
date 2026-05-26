// Phase 4a-1 RLS + schema-invariant test.
// Verifies migrations 0010 (agents auth columns + RLS) / 0011 (current_agent_id)
// / 0012 (NOT NULL) and the seed (5 approved + 1 rejected, every row linked to a
// real auth user). Behavioural assertions only — no information_schema reads.
//
// Pattern carried from rls-test-3bb2: anon + service-role clients, ephemeral
// users via admin.createUser/deleteUser, exact-count assertions, specific error
// codes for denial gates, deterministic teardown.
//
// Two phases:
//   A — assert the pristine seeded DB (counts, FK integrity, seed RPCs) BEFORE
//       any ephemeral agents row exists (so they don't inflate counts).
//   B — ephemeral mutations: helper-function null cases, write-policy denials,
//       schema invariants. Each gate cleans up before the next.
//
// Pre-req: 0010 + 0011 applied, `npm run seed:3ba` run, 0012 applied.
// Run: node --experimental-strip-types --env-file=.env.local scripts/rls-test-4a1.mjs
// Exit 0 = pass. Exit 1 = first FAIL.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
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

// Must match scripts/seed-3ba.mjs.
const SEED_PASSWORD = "nook-seed-2026";
const seedEmail = (legacyId) => `${legacyId}+seed@nook.test`;

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

const here = dirname(fileURLToPath(import.meta.url));
const idMap = JSON.parse(readFileSync(resolve(here, ".id-map-3ba.json"), "utf8"));
const AISHA_UUID = idMap.agents["agent-aisha"].uuid; // approved
const ARIF_EMAIL = seedEmail("agent-arif"); // rejected
const FLIP_UUID = idMap.agents["agent-ben"].uuid; // approved, flipped + restored in S1b

const admin = createClient(URL, SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

const createdUsers = [];
const createdAgents = [];

function fullAgentRow({ id, userId, slug, status, deletedAt = null, verifiedAt = null }) {
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
    verified_at: verifiedAt,
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

async function rpcAgentId(client) {
  const { data, error } = await client.rpc("current_agent_id");
  if (error) fail(`rpc current_agent_id: ${error.message}`);
  return data; // uuid string or null
}

async function teardown() {
  try {
    await admin.from("agents").update({ deleted_at: null }).eq("id", FLIP_UUID);
  } catch {}
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
  // ================================================================
  // Phase A — pristine seeded DB (no ephemeral agents row exists yet)
  // ================================================================

  step("S6 — seed: exactly 5 approved + 1 rejected agents");
  {
    const { count: approved, error: e1 } = await admin
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");
    if (e1) fail(`S6 approved count: ${e1.message}`);
    if (approved !== 5) fail(`S6 expected 5 approved, got ${approved}`);
    const { count: rejected, error: e2 } = await admin
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected");
    if (e2) fail(`S6 rejected count: ${e2.message}`);
    if (rejected !== 1) fail(`S6 expected 1 rejected, got ${rejected}`);
    ok("5 approved, 1 rejected");
  }

  step("S7 — seed: approved have verified_at; rejected/pending have null");
  {
    const { data: approvedRows, error: ae } = await admin
      .from("agents")
      .select("verified_at")
      .eq("status", "approved");
    if (ae) fail(`S7 approved select: ${ae.message}`);
    if (approvedRows.length !== 5) fail(`S7 expected 5 approved rows, got ${approvedRows.length}`);
    if (!approvedRows.every((r) => r.verified_at !== null)) fail("S7 an approved agent has null verified_at");
    const { data: otherRows, error: oe } = await admin
      .from("agents")
      .select("verified_at")
      .neq("status", "approved");
    if (oe) fail(`S7 non-approved select: ${oe.message}`);
    if (!otherRows.every((r) => r.verified_at === null)) fail("S7 a rejected/pending agent has non-null verified_at");
    ok("verified_at correlates with approved status");
  }

  step("S8 — seed: every agent row has a user_id that resolves in auth.users");
  {
    const { data: rows, error } = await admin.from("agents").select("id, user_id");
    if (error) fail(`S8 select: ${error.message}`);
    if (rows.length !== 6) fail(`S8 expected 6 agents, got ${rows.length}`);
    for (const r of rows) {
      if (!r.user_id) fail(`S8 agent ${r.id} has null user_id`);
      const { data: u, error: ue } = await admin.auth.admin.getUserById(r.user_id);
      if (ue || !u?.user) fail(`S8 agent ${r.id} user_id ${r.user_id} not in auth.users`);
    }
    ok("6/6 agents linked to a real auth user");
  }

  step("S1 — anon SELECT returns all 6 non-deleted agents");
  {
    const { count, error } = await anon
      .from("agents")
      .select("*", { count: "exact", head: true });
    if (error) fail(`S1 anon select: ${error.message}`);
    if (count !== 6) fail(`S1 expected 6 non-deleted, got ${count}`);
    ok("anon sees 6 rows");
  }

  step("S1b — soft-delete one seed agent → anon sees 5; restore");
  {
    const { error: fe } = await admin
      .from("agents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", FLIP_UUID);
    if (fe) fail(`S1b flip: ${fe.message}`);
    const { count, error } = await anon
      .from("agents")
      .select("*", { count: "exact", head: true });
    if (error) fail(`S1b anon select: ${error.message}`);
    if (count !== 5) fail(`S1b expected 5 after soft-delete, got ${count}`);
    const { error: re } = await admin
      .from("agents")
      .update({ deleted_at: null })
      .eq("id", FLIP_UUID);
    if (re) fail(`S1b restore: ${re.message}`);
    ok("soft-deleted agent hidden from anon (5), restored");
  }

  step("H1 — current_agent_id() is null for anon");
  {
    const id = await rpcAgentId(anon);
    if (id !== null) fail(`H1 expected null, got ${id}`);
    ok("anon → null");
  }

  step("H5 — current_agent_id() returns the id for an approved seed agent");
  {
    const c = await signedInClient(seedEmail("agent-aisha"), SEED_PASSWORD);
    const id = await rpcAgentId(c);
    if (id !== AISHA_UUID) fail(`H5 expected ${AISHA_UUID}, got ${id}`);
    ok(`approved seed agent → ${id}`);
  }

  step("H7 — current_agent_id() is null for the rejected seed agent (Arif)");
  {
    const c = await signedInClient(ARIF_EMAIL, SEED_PASSWORD);
    const id = await rpcAgentId(c);
    if (id !== null) fail(`H7 expected null, got ${id}`);
    ok("rejected seed agent → null");
  }

  // ================================================================
  // Phase B — ephemeral mutations (each gate self-cleans)
  // ================================================================

  step("H2 — current_agent_id() is null for an authenticated student");
  {
    const u = await makeEphemeralUser(); // no agents row
    const c = await signedInClient(u.email, u.password);
    const id = await rpcAgentId(c);
    if (id !== null) fail(`H2 expected null, got ${id}`);
    ok("student (no agents row) → null");
  }

  step("H3 — current_agent_id() is null for a pending agent");
  {
    const a = await makeEphemeralAgent({ status: "pending" });
    const c = await signedInClient(a.email, a.password);
    const id = await rpcAgentId(c);
    if (id !== null) fail(`H3 expected null, got ${id}`);
    ok("pending → null");
  }

  step("H4 — current_agent_id() is null for a rejected agent");
  {
    const a = await makeEphemeralAgent({ status: "rejected" });
    const c = await signedInClient(a.email, a.password);
    const id = await rpcAgentId(c);
    if (id !== null) fail(`H4 expected null, got ${id}`);
    ok("rejected → null");
  }

  step("H6 — current_agent_id() is null for a soft-deleted approved agent");
  {
    const a = await makeEphemeralAgent({ status: "approved", deletedAt: new Date().toISOString() });
    const c = await signedInClient(a.email, a.password);
    const id = await rpcAgentId(c);
    if (id !== null) fail(`H6 expected null, got ${id}`);
    ok("soft-deleted approved → null");
  }

  step("S2 — anon cannot INSERT / UPDATE / DELETE agents");
  {
    const u = await makeEphemeralUser();
    const { error: insErr } = await anon
      .from("agents")
      .insert(fullAgentRow({ id: randomUUID(), userId: u.id, slug: `eph-${randomUUID().slice(0, 8)}`, status: "pending" }))
      .select();
    if (!insErr) fail("S2 anon INSERT succeeded");
    if (insErr.code !== "42501") fail(`S2 anon INSERT: expected 42501, got ${insErr.code}`);
    const { data: upd } = await anon.from("agents").update({ name: "hacked" }).eq("id", AISHA_UUID).select();
    if ((upd?.length ?? 0) !== 0) fail(`S2 anon UPDATE affected ${upd.length} row(s)`);
    const { data: del } = await anon.from("agents").delete().eq("id", AISHA_UUID).select();
    if ((del?.length ?? 0) !== 0) fail(`S2 anon DELETE affected ${del.length} row(s)`);
    ok("anon INSERT denied (42501), UPDATE/DELETE affected 0 rows");
  }

  step("S2b — authenticated user cannot INSERT own row as status='approved'");
  {
    const u = await makeEphemeralUser();
    const c = await signedInClient(u.email, u.password);
    const { error } = await c
      .from("agents")
      .insert(fullAgentRow({ id: randomUUID(), userId: u.id, slug: `eph-${randomUUID().slice(0, 8)}`, status: "approved" }))
      .select();
    if (!error) fail("S2b approved self-insert succeeded");
    if (error.code !== "42501") fail(`S2b expected 42501, got ${error.code}`);
    ok("self-insert as approved denied (42501)");
  }

  step("S2c — authenticated user cannot INSERT a row owned by another user_id");
  {
    const u = await makeEphemeralUser();
    const other = await makeEphemeralUser();
    const c = await signedInClient(u.email, u.password);
    const { error } = await c
      .from("agents")
      .insert(fullAgentRow({ id: randomUUID(), userId: other.id, slug: `eph-${randomUUID().slice(0, 8)}`, status: "pending" }))
      .select();
    if (!error) fail("S2c spoofed user_id insert succeeded");
    if (error.code !== "42501") fail(`S2c expected 42501, got ${error.code}`);
    ok("insert with another user_id denied (42501)");
  }

  step("S2d — authenticated user inserts own pending row; UPDATE leaves status unchanged");
  {
    const u = await makeEphemeralUser();
    const c = await signedInClient(u.email, u.password);
    const id = randomUUID();
    const { error: insErr } = await c
      .from("agents")
      .insert(fullAgentRow({ id, userId: u.id, slug: `eph-${id.slice(0, 8)}`, status: "pending" }))
      .select();
    if (insErr) fail(`S2d own pending insert failed: ${insErr.message}`);
    createdAgents.push(id);
    // No UPDATE policy → unprivileged UPDATE affects 0 rows, no error. Verify by
    // read-back that status is still 'pending' (not an error-code gate).
    await c.from("agents").update({ status: "approved" }).eq("id", id);
    const { data: rb, error: rbe } = await admin.from("agents").select("status").eq("id", id).single();
    if (rbe) fail(`S2d read-back: ${rbe.message}`);
    if (rb.status !== "pending") fail(`S2d status changed to '${rb.status}' via unprivileged UPDATE`);
    ok("own pending insert succeeded; status unchanged after blocked UPDATE");
  }

  step("S3 — user_id rejects a non-uuid value (22P02)");
  {
    const { error } = await admin
      .from("agents")
      .insert(fullAgentRow({ id: randomUUID(), userId: "not-a-uuid", slug: `eph-${randomUUID().slice(0, 8)}`, status: "pending" }))
      .select();
    if (!error) fail("S3 non-uuid user_id accepted");
    if (error.code !== "22P02") fail(`S3 expected 22P02, got ${error.code}`);
    ok("non-uuid user_id rejected (22P02)");
  }

  step("S4 — duplicate user_id rejected by UNIQUE (23505)");
  {
    const dup = await makeEphemeralUser();
    const id1 = randomUUID();
    const { error: e1 } = await admin
      .from("agents")
      .insert(fullAgentRow({ id: id1, userId: dup.id, slug: `eph-${id1.slice(0, 8)}`, status: "pending" }));
    if (e1) fail(`S4 first insert: ${e1.message}`);
    createdAgents.push(id1);
    const id2 = randomUUID();
    const { error: e2 } = await admin
      .from("agents")
      .insert(fullAgentRow({ id: id2, userId: dup.id, slug: `eph-${id2.slice(0, 8)}`, status: "pending" }));
    if (!e2) fail("S4 duplicate user_id accepted");
    if (e2.code !== "23505") fail(`S4 expected 23505, got ${e2.code}`);
    ok("duplicate user_id rejected (23505)");
  }

  step("S5 — status outside the enum rejected by CHECK (23514)");
  {
    const u = await makeEphemeralUser();
    const id = randomUUID();
    const row = fullAgentRow({ id, userId: u.id, slug: `eph-${id.slice(0, 8)}`, status: "pending" });
    row.status = "bogus";
    const { error } = await admin.from("agents").insert(row);
    if (!error) fail("S5 invalid status accepted");
    if (error.code !== "23514") fail(`S5 expected 23514, got ${error.code}`);
    ok("invalid status rejected (23514)");
  }

  step("S9 — ON DELETE RESTRICT blocks deleting an auth user with an agents row");
  {
    const probe = await makeEphemeralUser();
    const pid = randomUUID();
    const { error: pe } = await admin
      .from("agents")
      .insert(fullAgentRow({ id: pid, userId: probe.id, slug: `eph-${pid.slice(0, 8)}`, status: "pending" }));
    if (pe) fail(`S9 probe insert: ${pe.message}`);
    createdAgents.push(pid);
    const { error: delErr } = await admin.auth.admin.deleteUser(probe.id);
    if (!delErr) fail("S9 deleteUser succeeded despite ON DELETE RESTRICT on agents.user_id");
    ok("RESTRICT blocked auth-user delete while agents row references it");
    // free the constraint, then the user (teardown also best-effort deletes both)
    await admin.from("agents").delete().eq("id", pid);
    await admin.auth.admin.deleteUser(probe.id);
  }

  console.log("\nrls-test-4a1 PASSED");
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
