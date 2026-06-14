// Phase 3b-B-1 acceptance test (A1–A3). A4 (build + import-hygiene grep + lint
// delta) runs outside this script.
// Anon-key only, no service-role key.
//
// Covers:
//   A1, idempotency (hash includes updated_at so a no-change upsert that
//        silently churns the row would show drift)
//   A2, shape parity vs seed lst-001 (every field except id), run against the
//        shared row-mapper output, plus UUID-derivation cross-check
//   A3, RLS: anon SELECT returns the full expected count; anon
//        INSERT / UPDATE / DELETE denied
//
// Pre-req: run `npm run seed:3bb1` ONCE before this script (service-role key).
//
// Run: node --env-file=.env.local --experimental-strip-types scripts/rls-test-3bb1.mjs
// Exit 0 = pass. Exit 1 = first FAIL.

import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { LISTINGS } from "../lib/seed/listings.ts";
// A2 oracle: the same pure row-mapper the app helpers use. Asserts on the
// Listing shape the app consumes, not the raw column, any mapper drift
// (e.g. id wired to slug instead of uuid, rating left as a string) is caught.
import { LISTING_COLS, rowToListing } from "../lib/data/_row-mappers.ts";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
for (const [k, v] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON })) {
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

const sb = createClient(URL, ANON, { auth: { persistSession: false } });

const here = dirname(fileURLToPath(import.meta.url));
const idMap = JSON.parse(readFileSync(resolve(here, ".id-map-3bb1.json"), "utf8"));
const NS = idMap.namespace;

// ============================================================
// A1, idempotency
// Hash incorporates updated_at so a no-change upsert that silently rewrites
// rows shows drift. Caller re-runs the seed and re-runs this script; the hash
// MUST match.
// ============================================================
step("A1, idempotency hash (re-run after re-seeding to compare)");
{
  const { data, error } = await sb
    .from("listings")
    .select("id, updated_at")
    .order("id");
  if (error) fail(`listings hash query: ${error.message}`);
  if (!data || data.length === 0) fail("listings returned 0 rows, seed not applied?");
  const concat = data.map((r) => `${r.id}|${r.updated_at}`).join(",");
  let h = 5381;
  for (const c of concat) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  ok(`listings: ${data.length} rows, hash ${(h >>> 0).toString(16)}`);
  ok(`re-run \`npm run seed:3bb1 && npm run rls-test:3bb1\` and compare hashes`);
}

// ============================================================
// A2, shape parity (every field except id) + UUID derivation check
// ============================================================
step("A2, helper-output shape parity vs seed lst-001 + UUID derivation");
{
  const seed = LISTINGS.find((l) => l.id === "lst-001");
  if (!seed) fail("seed missing lst-001");

  const { data: row, error } = await sb
    .from("listings")
    .select(LISTING_COLS)
    .eq("slug", "cosy-studio-bangsar-near-um")
    .maybeSingle();
  if (error || !row) fail(`fetch listing cosy-studio-bangsar-near-um: ${error?.message ?? "missing"}`);

  const listing = rowToListing(row);

  const expectedUuid = uuidv5("lst-001", NS);
  if (listing.id !== expectedUuid) {
    fail(`lst-001 id: expected uuidv5("lst-001", NS)=${expectedUuid}, got ${listing.id}`);
  }

  // Every field on the seed object except id must match the mapper output.
  // Both sides serialized so arrays / absent-optional (undefined) compare cleanly.
  //
  // Skipped fields (A2_SKIP): the mapper no longer emits these, but the seed
  // object still carries them, so comparing input-vs-output is meaningless:
  //   - photos (4c-B1): resolved to bucket URLs; seed has no photos field.
  //   - nearbyUniversityIds / walkMinsToCampus / metresToCampus (4c-B2): the
  //     DB columns were dropped (0019) and proximity is computed at read, so
  //     rowToListing omits them; the seed retains them only as historical data.
  // These skips are band-aids. A2 compares raw seed-object INPUT against RESOLVED
  // mapper OUTPUT, a wrong contract for every field the mapper resolves;
  // `areaId` (slug -> UUID since 0009) still fails here for that reason and is
  // left red intentionally. The real fix is reworking A2's oracle to compare
  // against expected resolved values, tracked as the A2-rework LC. Without it,
  // A2 decays toward all-skips; do not keep adding skips as the only response.
  const A2_SKIP = new Set([
    "id",
    "photos",
    "nearbyUniversityIds",
    "walkMinsToCampus",
    "metresToCampus",
  ]);
  for (const key of Object.keys(seed)) {
    if (A2_SKIP.has(key)) continue;
    const a = JSON.stringify(seed[key]);
    const b = JSON.stringify(listing[key]);
    if (a !== b) fail(`lst-001 field "${key}" mismatch: seed=${a} helper=${b}`);
  }
  // Guard the reverse direction too: mapper must not invent keys the seed lacks.
  for (const key of Object.keys(listing)) {
    if (A2_SKIP.has(key)) continue;
    if (listing[key] === undefined) continue;
    if (!(key in seed)) fail(`helper produced extra field "${key}" not on seed`);
  }
  ok(`lst-001 (helper output): id=${listing.id}, all ${Object.keys(seed).length - 1} non-id fields match seed`);
}

// ============================================================
// A3, RLS: anon read full count, anon writes denied
// ============================================================
step("A3, RLS: anon SELECT returns full listing count");
{
  // No .limit, fetch all and assert count equals the seeded total (from the
  // id-map, not a hardcoded literal). A policy leaking a subset would fail here.
  const { data, error } = await sb.from("listings").select("id");
  if (error) fail(`anon SELECT listings: ${error.message}`);
  const expected = Object.keys(idMap.listings).length;
  if (!data || data.length !== expected) {
    fail(`anon SELECT listings: expected ${expected} rows, got ${data?.length ?? 0}`);
  }
  ok(`anon SELECT listings: ${data.length} rows visible`);
}

step("A3, RLS: anon writes denied");
async function assertDenied(op, action) {
  const { data, error } = await action();
  const rows = data?.length ?? 0;
  if (rows !== 0) fail(`LEAK: anon ${op} on listings returned ${rows} row(s)`);
  if (error && !/permission|policy|row-level|violates/i.test(error.message)) {
    fail(`anon ${op} on listings errored but not with RLS message: ${error.message}`);
  }
  ok(`anon ${op} on listings: blocked (${error ? `"${error.message}"` : "0 rows"})`);
}
{
  const probeSlug = "cosy-studio-bangsar-near-um";
  await assertDenied("INSERT", () =>
    sb
      .from("listings")
      .insert({
        id: "00000000-0000-0000-0000-000000000003",
        slug: "rls-probe",
        title: "x",
        type: "studio",
        status: "available",
        price_monthly: 1,
        bedrooms: 1,
        bathrooms: 1,
        furnishing: "full",
        available_from: "2026-01-01",
        address: "x",
        area_id: "bangsar",
        city: "x",
        state: "x",
        lat: 0,
        lng: 0,
        amenities: [],
        description: "x",
        agent_id: "agent-aisha",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      })
      .select(),
  );
  await assertDenied("UPDATE", () =>
    sb.from("listings").update({ title: "hack" }).eq("slug", probeSlug).select(),
  );
  await assertDenied("DELETE", () =>
    sb.from("listings").delete().eq("slug", probeSlug).select(),
  );
}

console.log("\nrls-test-3bb1 PASSED");
process.exit(0);
