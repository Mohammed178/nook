// Phase 4b RLS write-policy test (LOCK-4.14). Verifies migration 0014:
// listings owner INSERT/UPDATE, no DELETE, two SELECT policies (public +
// owner), draft + soft-delete visibility, and the status CHECK constraint.
//
// Pattern carried from rls-test-4a1: anon + service-role clients, ephemeral
// users/agents via admin.createUser/deleteUser, exact-count assertions,
// post-state inspection for using-clause denials, error codes only where the
// denial genuinely raises (with-check / CHECK → 42501 / 23514), deterministic
// teardown. Fully self-contained — all agents and listings are ephemeral, so no
// seed id-map dependency and no seed-row mutation.
//
// Pre-req: 0010–0014 applied; seed not required (this test creates its own
// fixtures). Run:
//   node --experimental-strip-types --env-file=.env.local scripts/rls-test-4b.mjs
// Exit 0 = pass. Exit 1 = first FAIL.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  plantAvailableListing,
  demoteAndDeleteListing,
} from "./rls-harness.mjs";

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

const admin = createClient(URL, SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

const createdUsers = [];
const createdAgents = [];
const createdListings = [];

let AREA_UUID; // a real areas.id (FK target), resolved at runtime

const NOW = new Date().toISOString();

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

// Minimal valid listing row — satisfies every NOT NULL column and every 0014
// CHECK constraint. lat/lng omitted (nullable since 0014). Caller sets agent_id,
// status, slug, deleted_at as the gate requires.
function listingRow({ id, agentId, status = "draft", deletedAt = null, slug }) {
  return {
    id,
    slug: slug ?? `eph-${id.slice(0, 8)}`,
    title: "Ephemeral Listing",
    type: "studio",
    status,
    price_monthly: 1000,
    deposit: 2000,
    utilities_included: false,
    bedrooms: 1,
    bathrooms: 1,
    size_sqft: 400,
    furnishing: "full",
    gender_preference: "mixed",
    available_from: "2026-06-01",
    min_stay_months: 6,
    address: "Test Address",
    area_id: AREA_UUID,
    city: "Kuala Lumpur",
    state: "WP Kuala Lumpur",
    amenities: ["wifi"],
    description: "Ephemeral test listing.",
    agent_id: agentId,
    deleted_at: deletedAt,
    created_at: NOW,
    updated_at: NOW,
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

// Insert a listing as service-role (bypasses RLS) — used to plant fixtures the
// gate then exercises through anon / agent sessions.
async function plantListing(props) {
  const id = props.id ?? randomUUID();
  const row = listingRow({ ...props, id });
  const { error } = await admin.from("listings").insert(row);
  if (error) fail(`plant listing: ${error.message}`);
  createdListings.push(id);
  return id;
}

async function signedInClient(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) fail(`sign in ${email}: ${error.message}`);
  return c;
}

async function countById(client, id) {
  const { count, error } = await client
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("id", id);
  if (error) fail(`count by id ${id}: ${error.message}`);
  return count;
}

async function adminField(id, col) {
  const { data, error } = await admin
    .from("listings")
    .select(col)
    .eq("id", id)
    .single();
  if (error) fail(`admin read ${col} for ${id}: ${error.message}`);
  return data[col];
}

async function teardown() {
  // Demote-first: post-0015 an available listing's last photo cannot be deleted
  // and the cascade must not be wedged. Demoting available->draft (service-role)
  // clears both the last-photo trigger and the photo-presence trigger before the
  // listing (and its cascading listing_photos) is removed.
  for (const id of createdListings) {
    await demoteAndDeleteListing(admin, id);
  }
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
  // Resolve a real area UUID for the FK (listings.area_id → areas.id).
  {
    const { data, error } = await admin.from("areas").select("id").limit(1);
    if (error || !data?.length) fail(`resolve area uuid: ${error?.message ?? "no areas"}`);
    AREA_UUID = data[0].id;
  }

  // Shared approved agents + sessions for the G/D gates.
  // agentB exists only as a second owner (its agent_id is the spoof/transfer
  // target in G6/G9 and the foreign owner in G8); it never needs a session.
  const agentA = await makeEphemeralAgent({ status: "approved" });
  const agentB = await makeEphemeralAgent({ status: "approved" });
  const cA = await signedInClient(agentA.email, agentA.password);

  // ============================================================
  // G1–G6 — INSERT policy
  // ============================================================

  step("G1 — anon cannot INSERT a listing");
  {
    const id = randomUUID();
    const { error } = await anon
      .from("listings")
      .insert(listingRow({ id, agentId: agentA.agentId }))
      .select();
    if (!error) fail("G1 anon INSERT succeeded");
    if (error.code !== "42501") fail(`G1 expected 42501, got ${error.code}`);
    ok("anon INSERT denied (42501)");
  }

  step("G2 — authenticated student (no agents row) cannot INSERT");
  {
    const u = await makeEphemeralUser();
    const c = await signedInClient(u.email, u.password);
    const { error } = await c
      .from("listings")
      .insert(listingRow({ id: randomUUID(), agentId: agentA.agentId }))
      .select();
    if (!error) fail("G2 student INSERT succeeded");
    if (error.code !== "42501") fail(`G2 expected 42501, got ${error.code}`);
    ok("student INSERT denied (42501)");
  }

  step("G3 — pending agent cannot INSERT");
  {
    const a = await makeEphemeralAgent({ status: "pending" });
    const c = await signedInClient(a.email, a.password);
    const { error } = await c
      .from("listings")
      .insert(listingRow({ id: randomUUID(), agentId: a.agentId }))
      .select();
    if (!error) fail("G3 pending INSERT succeeded");
    if (error.code !== "42501") fail(`G3 expected 42501, got ${error.code}`);
    ok("pending agent INSERT denied (42501)");
  }

  step("G4 — rejected agent cannot INSERT");
  {
    const a = await makeEphemeralAgent({ status: "rejected" });
    const c = await signedInClient(a.email, a.password);
    const { error } = await c
      .from("listings")
      .insert(listingRow({ id: randomUUID(), agentId: a.agentId }))
      .select();
    if (!error) fail("G4 rejected INSERT succeeded");
    if (error.code !== "42501") fail(`G4 expected 42501, got ${error.code}`);
    ok("rejected agent INSERT denied (42501)");
  }

  step("G5 — approved agent CAN INSERT own draft");
  {
    const id = randomUUID();
    const { error } = await cA
      .from("listings")
      .insert(listingRow({ id, agentId: agentA.agentId, status: "draft" }))
      .select();
    if (error) fail(`G5 approved INSERT failed: ${error.message}`);
    createdListings.push(id);
    const status = await adminField(id, "status");
    const owner = await adminField(id, "agent_id");
    if (status !== "draft") fail(`G5 expected status draft, got ${status}`);
    if (owner !== agentA.agentId) fail(`G5 expected agent_id ${agentA.agentId}, got ${owner}`);
    ok("approved agent inserted own draft; status=draft, agent_id=self");
  }

  step("G6 — approved agent CANNOT INSERT with another agent's agent_id (spoof)");
  {
    const id = randomUUID();
    const { error } = await cA
      .from("listings")
      .insert(listingRow({ id, agentId: agentB.agentId }))
      .select();
    if (!error) fail("G6 spoofed agent_id INSERT succeeded");
    if (error.code !== "42501") fail(`G6 expected 42501, got ${error.code}`);
    const count = await countById(admin, id);
    if (count !== 0) fail(`G6 post-state: expected 0 rows for spoofed id, got ${count}`);
    ok("spoofed agent_id INSERT denied (42501); no row created");
  }

  // ============================================================
  // G7–G10 — UPDATE policy
  // ============================================================

  // agentA's own live listing, used by G7 + G9.
  const aOwn = await plantListing({ agentId: agentA.agentId, status: "draft" });

  step("G7 — approved agent CAN UPDATE their own listing");
  {
    const { error } = await cA
      .from("listings")
      .update({ title: "Updated By Owner" })
      .eq("id", aOwn)
      .select("id");
    if (error) fail(`G7 own UPDATE failed: ${error.message}`);
    const title = await adminField(aOwn, "title");
    if (title !== "Updated By Owner") fail(`G7 post-state: title is '${title}'`);
    ok("approved agent updated own listing; title changed");
  }

  step("G8 — approved agent CANNOT UPDATE another agent's listing (post-state unchanged)");
  {
    const bOwn = await plantListing({ agentId: agentB.agentId, status: "draft" });
    const original = await adminField(bOwn, "title");
    // using-clause filter → 0 rows, no error. Assert by post-state, not code.
    await cA.from("listings").update({ title: "Hacked By A" }).eq("id", bOwn);
    const after = await adminField(bOwn, "title");
    if (after !== original) fail(`G8 target title changed to '${after}'`);
    ok("cross-owner UPDATE affected 0 rows; target unchanged");
  }

  step("G9 — approved agent's UPDATE cannot transfer agent_id to another agent");
  {
    const { error } = await cA
      .from("listings")
      .update({ agent_id: agentB.agentId })
      .eq("id", aOwn)
      .select("id");
    if (!error) fail("G9 ownership transfer succeeded");
    if (error.code !== "42501") fail(`G9 expected 42501, got ${error.code}`);
    const owner = await adminField(aOwn, "agent_id");
    if (owner !== agentA.agentId) fail(`G9 post-state: agent_id changed to '${owner}'`);
    ok("ownership transfer denied (42501); agent_id unchanged");
  }

  step("G10 — soft-deleted agent loses INSERT and UPDATE immediately");
  {
    const agentC = await makeEphemeralAgent({ status: "approved" });
    const cC = await signedInClient(agentC.email, agentC.password);
    const cOwn = await plantListing({ agentId: agentC.agentId, status: "draft" });
    // Soft-delete the agent → current_agent_id() now returns null for this
    // session even though its JWT is still valid.
    const { error: sd } = await admin
      .from("agents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", agentC.agentId);
    if (sd) fail(`G10 soft-delete agent: ${sd.message}`);

    const { error: insErr } = await cC
      .from("listings")
      .insert(listingRow({ id: randomUUID(), agentId: agentC.agentId }))
      .select();
    if (!insErr) fail("G10 INSERT after soft-delete succeeded");
    if (insErr.code !== "42501") fail(`G10 INSERT expected 42501, got ${insErr.code}`);

    const before = await adminField(cOwn, "title");
    await cC.from("listings").update({ title: "Zombie Update" }).eq("id", cOwn);
    const after = await adminField(cOwn, "title");
    if (after !== before) fail(`G10 UPDATE after soft-delete changed title to '${after}'`);
    ok("soft-deleted agent: INSERT denied (42501), UPDATE affected 0 rows");
  }

  // ============================================================
  // D1–D5 — SELECT visibility + status CHECK
  // ============================================================

  // A draft owned by agentA, for D1 (public hidden) + D2 (owner visible).
  const draftId = await plantListing({ agentId: agentA.agentId, status: "draft" });

  step("D1 — anon/public SELECT does NOT return a draft");
  {
    const count = await countById(anon, draftId);
    if (count !== 0) fail(`D1 expected 0, got ${count}`);
    ok("draft invisible to anon (0 rows)");
  }

  step("D2 — owning agent SELECT DOES return their own draft");
  {
    const count = await countById(cA, draftId);
    if (count !== 1) fail(`D2 expected 1, got ${count}`);
    ok("owner sees own draft (1 row)");
  }

  // An available (published) listing owned by agentA, for D3 + D4. Post-0015 an
  // available row needs coords + a listing_photos row, so this is the multi-step
  // shared helper, not a single-INSERT plantListing.
  const { listingId: availId } = await plantAvailableListing({
    admin,
    areaUuid: AREA_UUID,
    agentId: agentA.agentId,
    createdListings,
    fail,
    now: NOW,
  });

  step("D3 — soft-delete hides from public but not from owner");
  {
    const pre = await countById(anon, availId);
    if (pre !== 1) fail(`D3 pre: expected anon 1, got ${pre}`);
    const { error } = await admin
      .from("listings")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", availId);
    if (error) fail(`D3 soft-delete: ${error.message}`);
    const anonCount = await countById(anon, availId);
    if (anonCount !== 0) fail(`D3 expected anon 0 after soft-delete, got ${anonCount}`);
    const ownerCount = await countById(cA, availId);
    if (ownerCount !== 1) fail(`D3 expected owner 1 after soft-delete, got ${ownerCount}`);
    ok("soft-deleted listing hidden from anon (0), visible to owner (1)");
  }

  step("D4 — restore (clear deleted_at) returns a non-draft listing to public");
  {
    const { error } = await admin
      .from("listings")
      .update({ deleted_at: null })
      .eq("id", availId);
    if (error) fail(`D4 restore: ${error.message}`);
    const anonCount = await countById(anon, availId);
    if (anonCount !== 1) fail(`D4 expected anon 1 after restore, got ${anonCount}`);
    ok("restored available listing visible to anon again (1 row)");
  }

  step("D5 — invalid status value rejected by CHECK (23514)");
  {
    const { error } = await admin
      .from("listings")
      .insert(listingRow({ id: randomUUID(), agentId: agentA.agentId, status: "archived" }));
    if (!error) fail("D5 invalid status accepted");
    if (error.code !== "23514") fail(`D5 expected 23514, got ${error.code}`);
    ok("invalid status 'archived' rejected by CHECK (23514)");
  }

  console.log("\nrls-test-4b PASSED");
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
