// Phase 4c-A RLS + integrity test. Verifies migration 0015:
//   - listing_photos RLS (owner write, public/owner read following parent status)
//   - publish preconditions: coords CHECK (23514), photo-presence trigger
//     (NK001), last-photo trigger (NK002)
//   - the listings -> listing_photos delete cascade is not wedged by the
//     last-photo trigger (P11)
//   - reorder under the DEFERRABLE (listing_id, sort_order) unique (P12)
//
// Harness mirrors rls-test-4b: anon + service-role clients, ephemeral
// users/agents, service-role fixtures, exact-count for visibility, post-state
// read-back for silent (using-clause) denials, error-code for genuine raises,
// demote-first teardown. Shares plantAvailableListing / teardown helpers with 4b
// via ./rls-harness.mjs.
//
// Pre-req: 0010-0015 applied + the `listing-photos` storage bucket exists; seed
// not required (creates its own fixtures). Run:
//   node --experimental-strip-types --env-file=.env.local scripts/rls-test-4c.mjs
// Exit 0 = pass. Exit 1 = first FAIL.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  draftListingRowWithCoords,
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

let AREA_UUID;
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

// A minimal valid DRAFT listing row WITHOUT coordinates (lat/lng omitted —
// nullable since 0014). Draft status means neither the photo trigger nor the
// coords CHECK fire on insert. Used where the gate needs a coordinate-less draft.
function draftRowNoCoords({ id, agentId }) {
  return {
    id,
    slug: `eph-${id.slice(0, 8)}`,
    title: "Ephemeral Draft",
    type: "studio",
    status: "draft",
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
    description: "Ephemeral draft listing.",
    agent_id: agentId,
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

async function signedInClient(email, password) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) fail(`sign in ${email}: ${error.message}`);
  return c;
}

// Plant a draft (no coords) as service-role. Returns the listing id.
async function plantDraft(agentId) {
  const id = randomUUID();
  const { error } = await admin.from("listings").insert(draftRowNoCoords({ id, agentId }));
  if (error) fail(`plant draft: ${error.message}`);
  createdListings.push(id);
  return id;
}

// Plant a draft WITH coords as service-role. Returns the listing id.
async function plantDraftWithCoords(agentId) {
  const id = randomUUID();
  const { error } = await admin
    .from("listings")
    .insert(draftListingRowWithCoords({ id, agentId, areaUuid: AREA_UUID, now: NOW }));
  if (error) fail(`plant draft+coords: ${error.message}`);
  createdListings.push(id);
  return id;
}

// Insert a photo as service-role. Returns the photo id.
async function plantPhoto(listingId, sortOrder) {
  const id = randomUUID();
  const { error } = await admin.from("listing_photos").insert({
    id,
    listing_id: listingId,
    storage_path: `${listingId}/${id}.jpg`,
    alt_text: "Ephemeral photo",
    sort_order: sortOrder,
  });
  if (error) fail(`plant photo (${sortOrder}): ${error.message}`);
  return id;
}

async function countPhotos(client, listingId) {
  const { count, error } = await client
    .from("listing_photos")
    .select("*", { count: "exact", head: true })
    .eq("listing_id", listingId);
  if (error) fail(`count photos ${listingId}: ${error.message}`);
  return count;
}

async function adminListingStatus(id) {
  const { data, error } = await admin
    .from("listings")
    .select("status")
    .eq("id", id)
    .single();
  if (error) fail(`admin read status for ${id}: ${error.message}`);
  return data.status;
}

async function teardown() {
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
  {
    const { data, error } = await admin.from("areas").select("id").limit(1);
    if (error || !data?.length) fail(`resolve area uuid: ${error?.message ?? "no areas"}`);
    AREA_UUID = data[0].id;
  }

  const agentA = await makeEphemeralAgent({ status: "approved" });
  const agentB = await makeEphemeralAgent({ status: "approved" });
  const cA = await signedInClient(agentA.email, agentA.password);
  const cB = await signedInClient(agentB.email, agentB.password);

  // ============================================================
  // P1–P5 — listing_photos RLS
  // ============================================================

  // A draft owned by agentA. P1 adds its first photo; P4/P5 reuse it.
  const draftA = await plantDraft(agentA.agentId);

  step("P1 — owner inserts a photo for their own listing");
  {
    const { error } = await cA
      .from("listing_photos")
      .insert({
        listing_id: draftA,
        storage_path: `${draftA}/${randomUUID()}.jpg`,
        alt_text: "Owner photo",
        sort_order: 0,
      })
      .select();
    if (error) fail(`P1 owner insert failed: ${error.code} ${error.message}`);
    const count = await countPhotos(admin, draftA);
    if (count !== 1) fail(`P1 expected 1 photo, got ${count}`);
    ok("owner photo inserted (post-state count 1)");
  }

  step("P2 — non-owner CANNOT insert a photo for another agent's listing");
  {
    const { error } = await cB
      .from("listing_photos")
      .insert({
        listing_id: draftA,
        storage_path: `${draftA}/${randomUUID()}.jpg`,
        alt_text: "Hacker photo",
        sort_order: 1,
      })
      .select();
    if (!error) fail("P2 non-owner insert succeeded");
    if (error.code !== "42501") fail(`P2 expected 42501, got ${error.code}`);
    const count = await countPhotos(admin, draftA);
    if (count !== 1) fail(`P2 post-state: photo count changed to ${count}`);
    ok("non-owner photo insert denied (42501); count unchanged");
  }

  // An available listing owned by agentA (coords + 1 photo), for P3.
  const availA = await plantAvailableListing({
    admin,
    areaUuid: AREA_UUID,
    agentId: agentA.agentId,
    createdListings,
    fail,
    now: NOW,
  });

  step("P3 — public reads photos of an available listing (count ≥ 1)");
  {
    const count = await countPhotos(anon, availA.listingId);
    if (count < 1) fail(`P3 expected ≥1, got ${count}`);
    ok(`available listing photos visible to anon (${count})`);
  }

  step("P4 — public does NOT see photos of a draft (count 0)");
  {
    const count = await countPhotos(anon, draftA);
    if (count !== 0) fail(`P4 expected 0, got ${count}`);
    ok("draft photos invisible to anon (0)");
  }

  step("P5 — owner sees their own draft's photos (count ≥ 1)");
  {
    const count = await countPhotos(cA, draftA);
    if (count < 1) fail(`P5 expected ≥1, got ${count}`);
    ok(`owner sees own draft photos (${count})`);
  }

  // ============================================================
  // P6–P9 — publish preconditions
  // ============================================================

  step("P6 — own draft with photo + coords publishes to available (post-state read-back)");
  {
    const id = await plantDraftWithCoords(agentA.agentId);
    await plantPhoto(id, 0);
    const { data, error } = await cA
      .from("listings")
      .update({ status: "available", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "draft")
      .select("id");
    if (error) fail(`P6 publish failed: ${error.code} ${error.message}`);
    if (!data || data.length === 0) fail("P6 publish affected 0 rows");
    const status = await adminListingStatus(id);
    if (status !== "available") fail(`P6 expected available, got ${status}`);
    ok("draft with photo + coords published (status available)");
  }

  step("P7 — publish WITHOUT a photo is denied (coords present, NK001)");
  {
    const id = await plantDraftWithCoords(agentA.agentId); // coords, no photo
    const { error } = await cA
      .from("listings")
      .update({ status: "available" })
      .eq("id", id)
      .eq("status", "draft")
      .select("id");
    if (!error) fail("P7 publish without photo succeeded");
    if (error.code !== "NK001") fail(`P7 expected NK001, got ${error.code}`);
    const status = await adminListingStatus(id);
    if (status !== "draft") fail(`P7 post-state: status changed to ${status}`);
    ok("publish without photo denied (NK001); still draft");
  }

  step("P8 — publish WITHOUT coords is denied (photo present, 23514)");
  {
    const id = await plantDraft(agentA.agentId); // no coords
    await plantPhoto(id, 0); // photo present, so the photo trigger passes
    const { error } = await cA
      .from("listings")
      .update({ status: "available" })
      .eq("id", id)
      .eq("status", "draft")
      .select("id");
    if (!error) fail("P8 publish without coords succeeded");
    if (error.code !== "23514") fail(`P8 expected 23514, got ${error.code}`);
    const status = await adminListingStatus(id);
    if (status !== "draft") fail(`P8 post-state: status changed to ${status}`);
    ok("publish without coords denied (23514); still draft");
  }

  step("P9 — non-owner CANNOT publish another agent's draft (post-state unchanged)");
  {
    const id = await plantDraftWithCoords(agentA.agentId); // publishable by A
    await plantPhoto(id, 0);
    // using-clause filter → 0 rows, no error. Assert by post-state, not code.
    await cB.from("listings").update({ status: "available" }).eq("id", id);
    const status = await adminListingStatus(id);
    if (status !== "draft") fail(`P9 cross-owner publish changed status to ${status}`);
    ok("cross-owner publish affected 0 rows; target still draft");
  }

  // ============================================================
  // P10 — last-photo trigger
  // ============================================================

  step("P10 — deleting the only photo of an available listing is denied (NK002)");
  {
    const a = await plantAvailableListing({
      admin,
      areaUuid: AREA_UUID,
      agentId: agentA.agentId,
      createdListings,
      fail,
      now: NOW,
    });
    const { error } = await cA
      .from("listing_photos")
      .delete()
      .eq("id", a.photoId)
      .select("id");
    if (!error) fail("P10 last-photo delete succeeded");
    if (error.code !== "NK002") fail(`P10 expected NK002, got ${error.code}`);
    const count = await countPhotos(admin, a.listingId);
    if (count !== 1) fail(`P10 post-state: photo count changed to ${count}`);
    ok("last-photo delete denied (NK002); photo intact");
  }

  // ============================================================
  // P11 — cascade delete is NOT wedged by the last-photo trigger
  // ============================================================

  step("P11 — cascade delete of an available-with-photos listing succeeds (no demote-first)");
  {
    const a = await plantAvailableListing({
      admin,
      areaUuid: AREA_UUID,
      agentId: agentA.agentId,
      createdListings,
      fail,
      now: NOW,
    });
    // Direct service-role hard-delete of the listings row. The cascade removes
    // the parent before the child listing_photos rows, so the last-photo trigger
    // must find no available parent and NOT raise NK002. Do NOT demote first.
    const { error } = await admin.from("listings").delete().eq("id", a.listingId);
    if (error) {
      fail(`P11 cascade delete RAISED ${error.code}: ${error.message}`);
    }
    const count = await countPhotos(admin, a.listingId);
    if (count !== 0) fail(`P11 expected 0 photos after cascade, got ${count}`);
    ok("cascade delete succeeded (no NK002); listing_photos count 0");
  }

  // ============================================================
  // P12 — reorder under the deferred unique constraint
  // ============================================================

  step("P12 — owner reorders own photos via single upsert (transient collision; read-back)");
  {
    const id = await plantDraft(agentA.agentId);
    const p0 = await plantPhoto(id, 0);
    const p1 = await plantPhoto(id, 1);
    const p2 = await plantPhoto(id, 2);

    // Rotation so EVERY row's sort_order changes — forces transient
    // (listing_id, sort_order) duplicates mid-statement, which only the
    // DEFERRABLE INITIALLY DEFERRED unique tolerates: target order [p1, p2, p0]
    // → p1:1→0, p2:2→1, p0:0→2.
    const orderedIds = [p1, p2, p0];

    const { data: photos, error: readErr } = await cA
      .from("listing_photos")
      .select("id, listing_id, storage_path, alt_text, sort_order, created_at")
      .eq("listing_id", id);
    if (readErr || !photos) fail(`P12 read photos: ${readErr?.message}`);
    const byId = new Map(photos.map((p) => [p.id, p]));
    const rows = orderedIds.map((pid, i) => ({ ...byId.get(pid), sort_order: i }));

    const { error: upErr } = await cA
      .from("listing_photos")
      .upsert(rows, { onConflict: "id" });
    if (upErr) fail(`P12 reorder upsert: ${upErr.code} ${upErr.message}`);

    const { data: after, error: afterErr } = await admin
      .from("listing_photos")
      .select("id, sort_order")
      .eq("listing_id", id)
      .order("sort_order", { ascending: true });
    if (afterErr || !after) fail(`P12 read-back: ${afterErr?.message}`);
    const gotOrder = after.map((r) => r.id);
    const want = [p1, p2, p0];
    if (gotOrder.length !== 3 || gotOrder.some((v, i) => v !== want[i])) {
      fail(`P12 expected order ${want.join(",")}, got ${gotOrder.join(",")}`);
    }
    ok("reorder applied through deferred unique (order p1,p2,p0)");
  }

  console.log("\nrls-test-4c PASSED");
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
