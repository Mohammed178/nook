// Phase H2, agents read-path redesign RLS test (the gate).
// Verifies migrations 0020 (agents_public view + slug_exists + agents_self_read)
// and 0021 (drop agents_public_read + revoke anon base SELECT).
//
// RUN ORDER MATTERS: this asserts the POST-CUTOVER state, so it must run AFTER
// both 0020 AND 0021 are applied (§6 runbook step 5). Before 0021, assertion T1
// (anon base read denied) WILL fail by design, that is the headline fix.
//
// Pattern carried from rls-test-4a2: anon + service-role clients, ephemeral users
// via admin.createUser/deleteUser, exact-set / exact-count / post-state assertions,
// deterministic teardown. The view's security is asserted by OUTCOME (anon sees only
// approved, exact columns, pending/rejected absent), not by introspection.
//
// Pre-req: 0010-0021 applied, `npm run seed:3ba` run.
// Run: node --experimental-strip-types --env-file=.env.local scripts/rls-test-h2.mjs
// Exit 0 = pass. Exit 1 = first FAIL.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
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

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const LINT_SCRIPT = resolve(root, "scripts/lint-service-role-containment.mjs");

// The exact column set the agents_public view must expose, the 15 safe columns,
// in lockstep with AGENT_PUBLIC_COLS and migration 0020's SELECT list.
const EXPECTED_PUBLIC_COLS = [
  "id", "slug", "name", "agency", "rating", "review_count",
  "response_time_mins", "languages", "avatar_url", "whatsapp", "phone",
  "email", "years_active", "bio", "bovaep_licence",
].sort();
// Columns that must NEVER appear in the view.
const FORBIDDEN_PUBLIC_COLS = [
  "user_id", "status", "status_reason", "submitted_at", "verified_at",
  "deleted_at", "decided_by", "decided_at",
];

const admin = createClient(URL, SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

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
    // Unique per fixture: 0025 added a partial UNIQUE index on bovaep_licence
    // (where deleted_at is null), so the 3 non-deleted fixtures cannot share one
    // value. (Index landed after this harness was written.)
    bovaep_licence: `EPH-${slug}`,
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
  const slug = `eph-${id.slice(0, 8)}`;
  const { error } = await admin
    .from("agents")
    .insert(fullAgentRow({ id, userId: u.id, slug, status, deletedAt }));
  if (error) fail(`insert ephemeral agent (${status}): ${error.message}`);
  createdAgents.push(id);
  return { ...u, agentId: id, slug };
}

async function signedInClient(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) fail(`sign in ${email}: ${error.message}`);
  return c;
}

function runScript(scriptPath, args) {
  return spawnSync("node", [scriptPath, ...args], {
    encoding: "utf8",
    cwd: root,
    env: process.env,
  });
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
  // Build the fixture set: one of each status, plus a soft-deleted pending.
  step("setup, ephemeral approved / pending / rejected / soft-deleted-pending agents");
  const approved = await makeEphemeralAgent({ status: "approved" });
  const pending = await makeEphemeralAgent({ status: "pending" });
  const rejected = await makeEphemeralAgent({ status: "rejected" });
  const softDeletedPending = await makeEphemeralAgent({
    status: "pending",
    deletedAt: new Date().toISOString(),
  });
  ok(`approved=${approved.slug} pending=${pending.slug} rejected=${rejected.slug}`);

  // T1, HEADLINE: anon direct base-table read must be DENIED with an error.
  step("T1, anon select=* on base `agents` → permission denied (NOT empty 200)");
  {
    const { data, error } = await anon.from("agents").select("*");
    if (!error) {
      fail(
        `T1 anon base read returned no error (rows=${data?.length ?? 0}). ` +
          `An empty array is a FAIL, it would mask a failed revoke / lingering grant.`,
      );
    }
    const denied =
      error.code === "42501" || /permission denied/i.test(error.message ?? "");
    if (!denied) fail(`T1 expected permission-denied (42501), got code=${error.code} msg=${error.message}`);
    ok(`anon base read denied (code=${error.code})`);
  }

  // T2, anon on agents_public: only approved, exact safe columns, sensitive absent,
  // bovaep_licence present (decision B).
  step("T2, anon on `agents_public`: approved-only, exact safe column set, bovaep present");
  {
    const { data: arow, error: ae } = await anon
      .from("agents_public")
      .select("*")
      .eq("slug", approved.slug)
      .maybeSingle();
    if (ae) fail(`T2 anon view read errored: ${ae.message}`);
    if (!arow) fail("T2 approved agent missing from agents_public");

    const keys = Object.keys(arow).sort();
    if (JSON.stringify(keys) !== JSON.stringify(EXPECTED_PUBLIC_COLS)) {
      fail(`T2 column set mismatch.\n  got:      ${keys}\n  expected: ${EXPECTED_PUBLIC_COLS}`);
    }
    for (const f of FORBIDDEN_PUBLIC_COLS) {
      if (f in arow) fail(`T2 forbidden column '${f}' present in agents_public`);
    }
    if (!("bovaep_licence" in arow) || arow.bovaep_licence == null) {
      fail("T2 bovaep_licence absent/null for approved agent (decision B)");
    }
    ok(`exact 15 safe cols; user_id/status_reason/decided_by absent; bovaep_licence present`);
  }

  // T3, view cannot leak a non-approved row (owner-rights gate). Pending + rejected
  // absent both by slug and by id.
  step("T3, agents_public hides pending & rejected (owner-rights WHERE is the gate)");
  {
    for (const a of [pending, rejected, softDeletedPending]) {
      const { data: bySlug } = await anon
        .from("agents_public")
        .select("id")
        .eq("slug", a.slug)
        .maybeSingle();
      if (bySlug) fail(`T3 non-approved agent ${a.slug} visible in agents_public`);
      const { data: byId } = await anon
        .from("agents_public")
        .select("id")
        .eq("id", a.agentId);
      if ((byId?.length ?? 0) !== 0) fail(`T3 non-approved id ${a.agentId} leaked via id filter`);
    }
    ok("pending, rejected, soft-deleted-pending all absent from agents_public");
  }

  // T4, authenticated PENDING agent: reads own row (agents_self_read), not others'.
  step("T4, authenticated pending agent reads OWN row; cannot read another agent's");
  {
    const c = await signedInClient(pending.email, pending.password);
    const { data: own } = await c
      .from("agents")
      .select("id, status")
      .eq("user_id", pending.id)
      .maybeSingle();
    if (!own) fail("T4 pending agent cannot read own row via agents_self_read");
    if (own.id !== pending.agentId) fail("T4 own-row id mismatch");
    if (own.status !== "pending") fail(`T4 own status '${own.status}'`);
    const { data: other } = await c
      .from("agents")
      .select("id")
      .eq("id", approved.agentId);
    if ((other?.length ?? 0) !== 0) fail(`T4 pending agent read another agent's row (${other.length})`);
    ok("own pending row readable; another agent's row → 0 rows");
  }

  // T5, authenticated APPROVED agent: own row readable + present in agents_public.
  step("T5, authenticated approved agent: own row readable + present in agents_public");
  {
    const c = await signedInClient(approved.email, approved.password);
    const { data: own } = await c
      .from("agents")
      .select("id, status")
      .eq("user_id", approved.id)
      .maybeSingle();
    if (!own) fail("T5 approved agent cannot read own row");
    const { data: pub } = await c
      .from("agents_public")
      .select("id")
      .eq("id", approved.agentId)
      .maybeSingle();
    if (!pub) fail("T5 approved agent absent from agents_public");
    ok("own row readable; present in agents_public");
  }

  // T6, admin service-role queue (listPendingAgents logic): exact count = pending
  // AND deleted_at null. Soft-deleted pending must NOT count.
  step("T6, service-role pending-queue count is exact (excludes soft-deleted)");
  {
    // Replicates app/admin/agents/_data.ts listPendingAgents query.
    const { data, error } = await admin
      .from("agents")
      .select("id, status, deleted_at")
      .eq("status", "pending")
      .is("deleted_at", null);
    if (error) fail(`T6 service-role select: ${error.message}`);
    const ids = data.map((r) => r.id);
    if (!ids.includes(pending.agentId)) fail("T6 active pending agent missing from queue");
    if (ids.includes(softDeletedPending.agentId)) fail("T6 soft-deleted pending agent counted in queue");
    // Every returned row must satisfy the invariant.
    for (const r of data) {
      if (r.status !== "pending" || r.deleted_at !== null) {
        fail(`T6 queue row ${r.id} violates pending+non-deleted invariant`);
      }
    }
    ok(`queue includes active pending, excludes soft-deleted; ${data.length} total pending`);
  }

  // T7, slug_exists RPC: true for any-status existing slug, false otherwise; the
  // register collision path catches an invisible pending slug pre-INSERT. Granted
  // to authenticated only.
  step("T7, slug_exists: any-status true, miss false, anon denied");
  {
    const c = await signedInClient(approved.email, approved.password);
    // pending slug is INVISIBLE to the public view, yet slug_exists must see it.
    const { data: hitPending, error: e1 } = await c.rpc("slug_exists", { p_slug: pending.slug });
    if (e1) fail(`T7 slug_exists(pending) errored: ${e1.message}`);
    if (hitPending !== true) fail(`T7 slug_exists(pending slug) returned ${hitPending}, expected true`);
    const { data: hitRejected } = await c.rpc("slug_exists", { p_slug: rejected.slug });
    if (hitRejected !== true) fail(`T7 slug_exists(rejected slug) returned ${hitRejected}, expected true`);
    const { data: miss } = await c.rpc("slug_exists", { p_slug: `no-such-${randomUUID()}` });
    if (miss !== false) fail(`T7 slug_exists(missing) returned ${miss}, expected false`);

    // Register collision path: deriveUniqueSlug would see true on the pending slug
    // and append -2. Prove the loop's exit condition resolves to a free candidate.
    let candidate = pending.slug;
    const { data: collides } = await c.rpc("slug_exists", { p_slug: candidate });
    if (collides !== true) fail("T7 collision precondition failed");
    candidate = `${pending.slug}-2`;
    const { data: freeNow } = await c.rpc("slug_exists", { p_slug: candidate });
    if (freeNow !== false) fail(`T7 derived candidate ${candidate} unexpectedly exists`);

    // anon must NOT be able to execute (grant is authenticated only).
    const { error: anonErr } = await anon.rpc("slug_exists", { p_slug: pending.slug });
    if (!anonErr) fail("T7 anon was able to execute slug_exists (grant should be authenticated-only)");
    ok("true for pending/rejected slugs; false for miss; collision→-2 resolves; anon denied");
  }

  // T8, H1→H2 seam: the moved app/admin/agents/_data.ts service-role import passes
  // the containment lint.
  step("T8, lint:service-role-containment passes with app/admin/agents/_data.ts");
  {
    const res = runScript(LINT_SCRIPT, []);
    if (res.status !== 0) {
      fail(`T8 containment lint failed (status ${res.status}): ${res.stdout}\n${res.stderr}`);
    }
    ok("containment lint exit 0 (service-role import confined to app/admin/)");
  }

  // T9, LC-26 decision notification resolves the AUTH/login email, not the public
  // contact column (agents.email). Replicates app/admin/agents/actions.ts decide()
  // resolution path: guarded UPDATE selecting user_id → admin.getUserById → email.
  // Also covers the miss-handling branch (unknown user_id → empty → skip send).
  //
  // The register action itself (separate contact_email field) is a cookie-bound
  // server action, not drivable from this harness; its decoupling is asserted here
  // at the read/resolution layer: login email (auth.users) and contact column
  // (agents.email) are independent and differ for the fixture.
  step("T9, decision notify resolves AUTH email (getUserById), not contact column");
  {
    const subject = await makeEphemeralAgent({ status: "pending" });
    const contactEmail = `${subject.slug}@nook.test`; // fullAgentRow sets this
    const loginEmail = subject.email; // ephemeral-<uuid>@nook.test (auth.users)
    if (loginEmail === contactEmail) {
      fail(`T9 fixture invalid: login and contact email coincide (${loginEmail})`);
    }

    // Replicate decide(): guarded UPDATE pending→approved, select user_id.
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from("agents")
      .update({
        status: "approved",
        status_reason: null,
        verified_at: nowIso,
        decided_at: nowIso,
      })
      .eq("id", subject.agentId)
      .eq("status", "pending")
      .is("deleted_at", null)
      .select("user_id, agency")
      .maybeSingle();
    if (error) fail(`T9 guarded update errored: ${error.message}`);
    if (!data) fail("T9 guarded update returned no row");

    // Resolve auth email the way decide() now does.
    const { data: au } = await admin.auth.admin.getUserById(data.user_id);
    const resolved = au?.user?.email ?? "";
    if (resolved !== loginEmail) {
      fail(`T9 resolved notify email '${resolved}', expected login '${loginEmail}'`);
    }
    if (resolved === contactEmail) {
      fail("T9 notify resolved the CONTACT column, not the auth/login email");
    }

    // Miss-handling: unknown user id → no user → empty email → caller skips send.
    const { data: miss } = await admin.auth.admin.getUserById(randomUUID());
    if ((miss?.user?.email ?? "") !== "") {
      fail("T9 getUserById(unknown) unexpectedly resolved an email");
    }
    ok(`notify → auth login '${loginEmail}' (≠ contact '${contactEmail}'); miss → empty (skip)`);
  }

  console.log("\nrls-test-h2 PASSED");
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
