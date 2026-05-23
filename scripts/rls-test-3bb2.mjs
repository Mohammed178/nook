// Phase 3b-B-2 acceptance test (A1–A5).
// Verifies migration 0008: favourites + recent_views listing_id is now a uuid
// FK to listings(id) ON DELETE CASCADE, existing RLS policies survived the
// in-place ALTER, and the LC-07 legacy fallback / dead code is gone.
//
//   A1 — schema/state stability (behavioural, Q1 option b — no pg dep):
//        both tables empty (0 rows); listing_id rejects a non-uuid string
//        (22P02 => column is uuid); proven state hashed, stable across re-runs.
//   A2 — FK enforcement: insert a listing_id uuid absent from listings => 23503.
//   A3 — CASCADE: throwaway listing + fav + view; delete listing => rows vanish.
//   A4 — RLS preserved, anon AND authed paths (catches silent policy loss).
//   A5 — dead-code grep: listingUuidForLegacyId + bare "lst-" => zero matches.
//
// Uses anon key (RLS paths) and service-role key (setup/teardown ONLY — never
// app code). Self-provisions two ephemeral auth users, tears them down.
//
// Pre-req: apply migrations 0008 + 0009 (post-0009 the probe listing references
// real area/agent UUIDs — listings.area_id/agent_id are uuid FKs, RESTRICT).
// Run: node --experimental-strip-types --env-file=.env.local scripts/rls-test-3bb2.mjs
// Exit 0 = pass. Exit 1 = first FAIL.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative, sep } from "node:path";

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
  process.exit(1);
}
function step(msg) {
  console.log(`\n→ ${msg}`);
}
function ok(msg) {
  console.log(`  ${msg}`);
}
function djb2(s) {
  let h = 5381;
  for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return (h >>> 0).toString(16);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const idMap = JSON.parse(
  readFileSync(resolve(here, ".id-map-3bb1.json"), "utf8"),
);
const idMap3ba = JSON.parse(
  readFileSync(resolve(here, ".id-map-3ba.json"), "utf8"),
);

// A real listing UUID (lst-001) for the valid-FK paths.
const REAL_LISTING = idMap.listings["lst-001"].uuid;
// Valid uuid syntax, NOT a seeded listing (FK target missing).
const ABSENT_LISTING = "deadbeef-dead-4ead-8ead-deaddeadbeef";
// Throwaway listing for the cascade test (deleted during A3).
const PROBE_LISTING = "11111111-1111-4111-8111-111111111111";
const PROBE_SLUG = "cascade-probe-zzz-3bb2";
const NON_UUID = "lst-001"; // legacy-shaped string => must fail uuid cast
// Real area + agent UUIDs for the probe listing. Post-0009 listings.area_id /
// agent_id are uuid FKs (RESTRICT) to areas/agents, so the probe must point at
// real parent rows or its insert fails 23503.
const PROBE_AREA = idMap3ba.areas["bangsar"].uuid;
const PROBE_AGENT = idMap3ba.agents["agent-aisha"].uuid;

const admin = createClient(URL, SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

function probeListingRow() {
  return {
    id: PROBE_LISTING,
    slug: PROBE_SLUG,
    title: "Cascade probe",
    type: "studio",
    status: "available",
    price_monthly: 1,
    bedrooms: 1,
    bathrooms: 1,
    furnishing: "full",
    available_from: "2026-01-01",
    address: "x",
    area_id: PROBE_AREA,
    city: "x",
    state: "x",
    lat: 0,
    lng: 0,
    nearby_university_ids: [],
    amenities: [],
    photos: [],
    description: "x",
    agent_id: PROBE_AGENT,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };
}

const stamp = Date.now();
const userA = {
  email: `rls-3bb2-a-${stamp}@example.com`,
  password: "Test-3bb2-Pass!",
  id: null,
};
const userB = {
  email: `rls-3bb2-b-${stamp}@example.com`,
  password: "Test-3bb2-Pass!",
  id: null,
};

async function teardown() {
  // Best-effort cleanup; ignore errors.
  await admin.from("listings").delete().eq("id", PROBE_LISTING);
  if (userA.id) await admin.auth.admin.deleteUser(userA.id);
  if (userB.id) await admin.auth.admin.deleteUser(userB.id);
}

async function main() {
  // ----------------------------------------------------------------
  // Setup — ephemeral users
  // ----------------------------------------------------------------
  step("setup — provision two ephemeral auth users (service-role)");
  for (const u of [userA, userB]) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error || !data?.user) fail(`createUser ${u.email}: ${error?.message}`);
    u.id = data.user.id;
  }
  ok(`user A=${userA.id}, user B=${userB.id}`);

  // ----------------------------------------------------------------
  // A1 — schema/state stability (behavioural)
  // ----------------------------------------------------------------
  step("A1 — both tables empty + listing_id is uuid (re-run to compare hash)");
  for (const t of ["favourites", "recent_views"]) {
    const { count, error } = await admin
      .from(t)
      .select("*", { count: "exact", head: true });
    if (error) fail(`${t} count: ${error.message}`);
    if (count !== 0) fail(`${t} expected 0 rows post-migration, got ${count}`);
  }
  // Non-uuid string must be rejected by the column type (proves uuid, not text).
  const colProof = {};
  for (const t of ["favourites", "recent_views"]) {
    const { error } = await admin
      .from(t)
      .insert({ user_id: userA.id, listing_id: NON_UUID })
      .select();
    if (!error) fail(`${t}.listing_id accepted non-uuid "${NON_UUID}" — still text?`);
    if (error.code !== "22P02") {
      fail(`${t} non-uuid insert: expected 22P02, got ${error.code} (${error.message})`);
    }
    colProof[t] = "uuid";
  }
  const a1hash = djb2(
    `fav:0|recent:0|fav_type:${colProof.favourites}|recent_type:${colProof.recent_views}`,
  );
  ok(`favourites + recent_views: 0 rows, listing_id rejects non-uuid (22P02)`);
  ok(`A1 state hash ${a1hash} — re-run this script and compare`);

  // ----------------------------------------------------------------
  // A2 — FK enforcement (absent listing => 23503)
  // ----------------------------------------------------------------
  step("A2 — FK enforcement: listing_id absent from listings is rejected");
  for (const t of ["favourites", "recent_views"]) {
    const { error } = await admin
      .from(t)
      .insert({ user_id: userA.id, listing_id: ABSENT_LISTING })
      .select();
    if (!error) fail(`${t}: insert of absent listing_id succeeded — no FK?`);
    if (error.code !== "23503") {
      fail(`${t}: expected 23503 FK violation, got ${error.code} (${error.message})`);
    }
    ok(`${t}: absent listing_id blocked (23503 "${error.message}")`);
  }

  // ----------------------------------------------------------------
  // A3 — CASCADE
  // ----------------------------------------------------------------
  step("A3 — ON DELETE CASCADE: delete listing removes dependent rows");
  {
    const { error: le } = await admin.from("listings").insert(probeListingRow());
    if (le) fail(`seed probe listing: ${le.message}`);
    const { error: fe } = await admin
      .from("favourites")
      .insert({ user_id: userA.id, listing_id: PROBE_LISTING });
    if (fe) fail(`seed probe favourite: ${fe.message}`);
    const { error: ve } = await admin
      .from("recent_views")
      .insert({ user_id: userA.id, listing_id: PROBE_LISTING });
    if (ve) fail(`seed probe recent_view: ${ve.message}`);

    const { error: de } = await admin
      .from("listings")
      .delete()
      .eq("id", PROBE_LISTING);
    if (de) fail(`delete probe listing: ${de.message}`);

    for (const t of ["favourites", "recent_views"]) {
      const { count, error } = await admin
        .from(t)
        .select("*", { count: "exact", head: true })
        .eq("listing_id", PROBE_LISTING);
      if (error) fail(`${t} post-cascade count: ${error.message}`);
      if (count !== 0) fail(`${t}: ${count} row(s) survived listing delete — no CASCADE`);
      ok(`${t}: dependent rows cascaded away on listing delete`);
    }
  }

  // ----------------------------------------------------------------
  // A4 — RLS preserved (anon + authed)
  // ----------------------------------------------------------------
  step("A4 — RLS preserved: anon blocked, owner sees own, other user does not");
  const authedA = createClient(URL, ANON, { auth: { persistSession: false } });
  const authedB = createClient(URL, ANON, { auth: { persistSession: false } });
  {
    const { error: ea } = await authedA.auth.signInWithPassword({
      email: userA.email,
      password: userA.password,
    });
    if (ea) fail(`sign in user A: ${ea.message}`);
    const { error: eb } = await authedB.auth.signInWithPassword({
      email: userB.email,
      password: userB.password,
    });
    if (eb) fail(`sign in user B: ${eb.message}`);
  }

  for (const t of ["favourites", "recent_views"]) {
    // anon SELECT => 0 rows (policy blocks unauthenticated reads)
    const { data: anonRows, error: anonErr } = await anon.from(t).select("*");
    if (anonErr) fail(`anon SELECT ${t}: unexpected error ${anonErr.message}`);
    if ((anonRows?.length ?? 0) !== 0) {
      fail(`LEAK: anon SELECT ${t} returned ${anonRows.length} row(s)`);
    }

    // anon INSERT => denied
    const { error: anonIns } = await anon
      .from(t)
      .insert({ user_id: userA.id, listing_id: REAL_LISTING })
      .select();
    if (!anonIns || !/permission|policy|row-level|violates/i.test(anonIns.message)) {
      fail(`anon INSERT ${t}: expected RLS denial, got ${anonIns?.message ?? "success"}`);
    }

    // service-role seed a row for user A
    const { error: seedErr } = await admin
      .from(t)
      .insert({ user_id: userA.id, listing_id: REAL_LISTING });
    if (seedErr) fail(`seed ${t} for user A: ${seedErr.message}`);

    // owner (A) sees exactly 1; other user (B) sees 0
    const { data: aRows, error: aErr } = await authedA.from(t).select("*");
    if (aErr) fail(`authed A SELECT ${t}: ${aErr.message}`);
    if ((aRows?.length ?? 0) !== 1) {
      fail(`authed A SELECT ${t}: expected 1 own row, got ${aRows?.length ?? 0}`);
    }
    const { data: bRows, error: bErr } = await authedB.from(t).select("*");
    if (bErr) fail(`authed B SELECT ${t}: ${bErr.message}`);
    if ((bRows?.length ?? 0) !== 0) {
      fail(`LEAK: authed B SELECT ${t} saw user A's ${bRows.length} row(s)`);
    }

    // cleanup the seeded row
    await admin.from(t).delete().eq("user_id", userA.id).eq("listing_id", REAL_LISTING);
    ok(`${t}: anon blocked, owner sees 1, non-owner sees 0`);
  }

  // ----------------------------------------------------------------
  // A5 — dead-code grep (in-script fs scan; no rg/grep dependency)
  // ----------------------------------------------------------------
  step("A5 — dead-code grep: listingUuidForLegacyId + bare lst- => 0 matches");
  {
    const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
    const roots = ["app", "components", "lib"].map((d) => join(root, d));
    const files = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (name === "node_modules") continue;
          walk(p);
        } else if (exts.has(p.slice(p.lastIndexOf(".")))) {
          files.push(p);
        }
      }
    };
    for (const r of roots) walk(r);

    // gate 1: no callers of the stripped helper anywhere in app/components/lib
    const g1 = [];
    // gate 2: no bare "lst-" outside the allowed islands
    const g2 = [];
    const lstAllowed = (rel) =>
      rel.startsWith(`lib${sep}seed${sep}`) ||
      rel === join("lib", "data", "legacy-id-bridge.ts");

    for (const f of files) {
      const rel = relative(root, f);
      const text = readFileSync(f, "utf8");
      if (text.includes("listingUuidForLegacyId")) g1.push(rel);
      if (!lstAllowed(rel) && /lst-/.test(text)) g2.push(rel);
    }
    if (g1.length) fail(`listingUuidForLegacyId still referenced in: ${g1.join(", ")}`);
    if (g2.length) fail(`bare "lst-" still present in: ${g2.join(", ")}`);
    ok(`${files.length} files scanned: 0 listingUuidForLegacyId, 0 stray lst-`);
  }

  console.log("\nrls-test-3bb2 PASSED");
}

try {
  await main();
  await teardown();
  process.exit(0);
} catch (err) {
  await teardown();
  console.error(err);
  process.exit(1);
}
