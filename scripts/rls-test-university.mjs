// Migration 0036 — university-lister RLS + constraint harness.
// Verifies the DB-layer invariants the university-onboarding feature relies on:
//   (a) authenticated INSERT with the new lister columns (lister_type,
//       university_id, contact_person_name, contact_person_role,
//       application_notes) lands a PENDING university row — catches a missing
//       column grant (42501 is runtime-only).
//   (b) constraint violations fail:
//        b1  lister_type='university' with a bovaep_licence -> 23514
//            (agents_university_no_licence_chk)
//        b2  lister_type='university' with university_id NULL -> 23514
//            (agents_university_link_chk)
//   (c) a SECOND live account for the same university -> 23505
//       (agents_one_account_per_university); soft-deleting the first frees it.
//   (d) agents_public exposes lister_type/university_id for an approved
//       university, and NEVER contact_person_name / application_notes /
//       verification_note (they are not in the view).
//   (e) university_account_exists is anon-callable and matches the index
//       predicate (true for a live non-rejected account, false after soft-delete).
//
// Pattern carried from rls-test-agentflow: anon + service-role clients, ephemeral
// users via admin.createUser/deleteUser, exact-code / post-state read-backs,
// deterministic teardown.
//
// PRE-REQ: migration 0036 applied (after 0035). (a)/(c)/(e) FAIL if 0036 is not
// yet applied — that is correct: this harness is the post-cutover gate.
//
// Run: node --experimental-strip-types --env-file=.env.local scripts/rls-test-university.mjs
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

function uniqueSlug() {
  return `uni-${randomUUID().slice(0, 8)}`;
}

// The columns an authenticated university registrant is granted (0024 + 0036).
function grantedUniversityCols(userId, universityId) {
  const slug = uniqueSlug();
  return {
    user_id: userId,
    slug,
    name: "Ephemeral University Office",
    agency: "Ephemeral University",
    phone: "+60000000000",
    whatsapp: "+60000000000",
    email: `${slug}@nook.test`,
    lister_type: "university",
    university_id: universityId,
    contact_person_name: "Test Officer",
    contact_person_role: "Head of Housing",
    application_notes: "Please verify via the switchboard.",
  };
}

async function makeEphemeralUser() {
  const email = `ephemeral-uni-${randomUUID()}@nook.test`;
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

async function signedInClient(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) fail(`sign in ${email}: ${error.message}`);
  return c;
}

async function anyLiveUniversityId() {
  const { data, error } = await admin
    .from("universities")
    .select("id")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (error || !data) fail(`no live university to test against: ${error?.message}`);
  return data.id;
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
  const universityId = await anyLiveUniversityId();
  ok(`testing against university ${universityId}`);

  // ── (a) ─────────────────────────────────────────────────────────────────────
  step("(a) authenticated INSERT of the granted university columns -> pending row");
  let firstAgentId;
  {
    const u = await makeEphemeralUser();
    const c = await signedInClient(u.email, u.password);
    const { data, error } = await c
      .from("agents")
      .insert(grantedUniversityCols(u.id, universityId))
      .select("id, status, lister_type, university_id")
      .single();
    if (error) fail(`(a) INSERT denied (${error.code}): ${error.message} — is 0036 applied?`);
    if (data.status !== "pending") fail(`(a) expected pending, got ${data.status}`);
    if (data.lister_type !== "university") fail(`(a) lister_type not persisted`);
    if (data.university_id !== universityId) fail(`(a) university_id not persisted`);
    firstAgentId = data.id;
    createdAgents.push(firstAgentId);
    ok(`pending university row created (${firstAgentId})`);
  }

  // ── (b) ─────────────────────────────────────────────────────────────────────
  step("(b1) university row carrying a bovaep_licence -> 23514");
  {
    const u = await makeEphemeralUser();
    const id = randomUUID();
    const row = {
      ...grantedUniversityCols(u.id, universityId),
      id,
      rating: 0,
      review_count: 0,
      response_time_mins: 60,
      languages: ["en"],
      avatar_url: "/agent-placeholder.svg",
      years_active: 0,
      bovaep_licence: "E(3)9999",
    };
    const { error } = await admin.from("agents").insert(row);
    if (!error) {
      createdAgents.push(id);
      fail("(b1) university INSERT with a licence succeeded — no-licence check missing");
    }
    if (error.code !== "23514") fail(`(b1) expected 23514, got ${error.code}: ${error.message}`);
    ok(`no-licence check fired (23514)`);
  }

  step("(b2) university row with university_id NULL -> 23514");
  {
    const u = await makeEphemeralUser();
    const id = randomUUID();
    const row = {
      ...grantedUniversityCols(u.id, universityId),
      id,
      university_id: null,
      rating: 0,
      review_count: 0,
      response_time_mins: 60,
      languages: ["en"],
      avatar_url: "/agent-placeholder.svg",
      years_active: 0,
    };
    const { error } = await admin.from("agents").insert(row);
    if (!error) {
      createdAgents.push(id);
      fail("(b2) university INSERT with null university_id succeeded — link check missing");
    }
    if (error.code !== "23514") fail(`(b2) expected 23514, got ${error.code}: ${error.message}`);
    ok(`link check fired (23514)`);
  }

  // ── (c) ─────────────────────────────────────────────────────────────────────
  step("(c) a SECOND live account for the same university -> 23505; soft-delete frees it");
  {
    const u = await makeEphemeralUser();
    const c = await signedInClient(u.email, u.password);
    const { error: dupErr } = await c
      .from("agents")
      .insert(grantedUniversityCols(u.id, universityId));
    if (!dupErr) fail("(c) second live account allowed — partial unique index missing");
    if (dupErr.code !== "23505") fail(`(c) expected 23505, got ${dupErr.code}: ${dupErr.message}`);
    ok(`duplicate live account blocked (23505)`);

    // soft-delete the first -> the second can now register
    await admin.from("agents").update({ deleted_at: new Date().toISOString() }).eq("id", firstAgentId);
    const { data: retry, error: retryErr } = await c
      .from("agents")
      .insert(grantedUniversityCols(u.id, universityId))
      .select("id")
      .single();
    if (retryErr) fail(`(c) re-register after soft-delete failed: ${retryErr.message}`);
    createdAgents.push(retry.id);
    ok(`account freed after soft-delete, re-register ok`);
    // restore first for the remaining checks (leave the just-created one soft-deleted)
    await admin.from("agents").update({ deleted_at: new Date().toISOString() }).eq("id", retry.id);
    await admin.from("agents").update({ deleted_at: null }).eq("id", firstAgentId);
  }

  // ── (d) ─────────────────────────────────────────────────────────────────────
  step("(d) agents_public exposes lister_type/university_id, hides contact/notes");
  {
    await admin.from("agents").update({ status: "approved" }).eq("id", firstAgentId);
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const { data, error } = await anon
      .from("agents_public")
      .select("*")
      .eq("id", firstAgentId)
      .maybeSingle();
    if (error) fail(`(d) agents_public read: ${error.message}`);
    if (!data) fail(`(d) approved university not visible in agents_public`);
    if (data.lister_type !== "university") fail(`(d) lister_type not exposed`);
    if (data.university_id !== universityId) fail(`(d) university_id not exposed`);
    for (const priv of ["contact_person_name", "contact_person_role", "application_notes", "verification_note"]) {
      if (priv in data) fail(`(d) private column ${priv} leaked into agents_public`);
    }
    ok(`safe columns exposed, private columns absent`);
  }

  // ── (e) ─────────────────────────────────────────────────────────────────────
  step("(e) university_account_exists is anon-callable and matches the index predicate");
  {
    const anon = createClient(URL, ANON, { auth: { persistSession: false } });
    const { data: exists, error } = await anon.rpc("university_account_exists", {
      p_university_id: universityId,
    });
    if (error) fail(`(e) RPC error: ${error.message}`);
    if (exists !== true) fail(`(e) expected true for a live account, got ${exists}`);
    ok(`true for a live account`);

    await admin.from("agents").update({ deleted_at: new Date().toISOString() }).eq("id", firstAgentId);
    const { data: after } = await anon.rpc("university_account_exists", {
      p_university_id: universityId,
    });
    if (after !== false) fail(`(e) expected false after soft-delete, got ${after}`);
    ok(`false after the account is soft-deleted`);
  }

  console.log("\nPASS: all university-lister RLS checks green");
}

main()
  .then(teardown)
  .then(() => process.exit(0))
  .catch(async (e) => {
    await teardown();
    console.error(e.message);
    process.exit(1);
  });
