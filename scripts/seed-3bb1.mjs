// Phase 3b-B-1 seed (updated for 3b-B-3).
// Reads lib/seed/listings.ts (no .mjs mirror — single source of truth),
// derives deterministic UUIDv5 ids (reusing the 3b-A NS_NOOK namespace), keeps
// slugs verbatim, resolves photos (galleryFor already runs at module load, so
// l.photos is the resolved string[]), upserts into Supabase using the
// service-role key, and writes scripts/.id-map-3bb1.json.
//
// 3b-B-3: area_id / agent_id are now written as UUIDs (read from the committed
// scripts/.id-map-3ba.json), matching the uuid FK columns introduced by
// migration 0009. Must be run AFTER 0009 — the uuid columns reject the legacy
// slug strings this script used to emit.
//
// Run: node --experimental-strip-types --env-file=.env.local scripts/seed-3bb1.mjs
// Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Service-role key is never imported by app code.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";
import { LISTINGS } from "../lib/seed/listings.ts";

// Frozen namespace — reused from 3b-A. DO NOT introduce a new one.
const NS_NOOK = "b6e7f7a4-9c1e-5c0a-9b3d-3f6f4f7e1c2a";

const HERE = dirname(fileURLToPath(import.meta.url));

// Committed id-map artifact from 3b-A — single source of truth for the
// legacy-area/agent-id -> UUID translation. Read here (not imported) to stay
// agnostic of Node's JSON import-attribute support.
const idMap3ba = JSON.parse(
  readFileSync(resolve(HERE, ".id-map-3ba.json"), "utf8"),
);

function areaUuid(legacyAreaId) {
  const uuid = idMap3ba.areas?.[legacyAreaId]?.uuid;
  if (!uuid) {
    console.error(`No area UUID in .id-map-3ba.json for "${legacyAreaId}"`);
    process.exit(1);
  }
  return uuid;
}

function agentUuid(legacyAgentId) {
  const uuid = idMap3ba.agents?.[legacyAgentId]?.uuid;
  if (!uuid) {
    console.error(`No agent UUID in .id-map-3ba.json for "${legacyAgentId}"`);
    process.exit(1);
  }
  return uuid;
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
for (const [k, v] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: URL, SUPABASE_SERVICE_ROLE_KEY: SRK })) {
  if (!v) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

const sb = createClient(URL, SRK, { auth: { persistSession: false } });

// Seed every listing as DRAFT first, regardless of its final status. The 0015
// photo-presence trigger (NK001) fires on the INSERT branch of an upsert with
// tg_op='INSERT' — so an `available` row cannot be inserted before its
// listing_photos rows exist. We insert as draft, add photos, then promote the
// originally-available rows back (same draft -> photo -> publish order the rls
// harness uses). promoteRows captures the intended final status per id.
const promoteRows = LISTINGS.filter((l) => l.status !== "draft").map((l) => ({
  id: uuidv5(l.id, NS_NOOK),
  status: l.status,
}));

const listingRows = LISTINGS.map((l) => ({
  id: uuidv5(l.id, NS_NOOK),
  slug: l.slug,
  title: l.title,
  type: l.type,
  status: "draft",
  price_monthly: l.priceMonthly,
  deposit: l.deposit ?? null,
  utilities_included: l.utilitiesIncluded ?? null,
  bedrooms: l.bedrooms,
  bathrooms: l.bathrooms,
  size_sqft: l.sizeSqft ?? null,
  furnishing: l.furnishing,
  gender_preference: l.genderPreference ?? null,
  available_from: l.availableFrom,
  min_stay_months: l.minStayMonths ?? null,
  address: l.address,
  area_id: areaUuid(l.areaId),
  city: l.city,
  state: l.state,
  lat: l.lat,
  lng: l.lng,
  amenities: l.amenities,
  description: l.description,
  agent_id: agentUuid(l.agentId),
  rating: l.rating ?? null,
  review_count: l.reviewCount ?? null,
  featured: l.featured ?? null,
  listed_today: l.listedToday ?? null,
  created_at: l.createdAt,
  updated_at: l.updatedAt,
}));

console.log(`Upserting ${listingRows.length} listings...`);
{
  const { error } = await sb
    .from("listings")
    .upsert(listingRows, { onConflict: "id", ignoreDuplicates: false });
  if (error) {
    console.error(`listings upsert failed: ${error.message}`);
    process.exit(1);
  }
}

// ---------- listing_photos re-host (4c-B1) ----------
// The legacy listings.photos column held external Unsplash URLs. Phase 4c stores
// photos as bucket objects at {listing_id}/{photo_uuid}.jpg with one
// listing_photos row each. Download a small demo pool once, then upload a
// per-listing copy set — the path's first segment must be the listing_id so the
// storage RLS owner-check resolves through the parent listing. Pre-req: 0015's
// `listing-photos` bucket exists. Deterministic uuids + storage upsert make the
// whole step idempotent (re-running overwrites in place, no orphan growth).
//
// onConflict is the PK `id`, NOT (listing_id, sort_order): that unique is
// DEFERRABLE INITIALLY DEFERRED (0015) and Postgres rejects a deferrable
// constraint as an ON CONFLICT arbiter — same reason reorderListingPhotos
// arbitrates on the PK.
const DEMO_POOL = [
  "1502672260266-1c1ef2d93688",
  "1505691938895-1758d7feb511",
  "1522708323590-d24dbb6b0267",
  "1560448204-e02f11c3d0e2",
  "1568605114967-8130f3a36994",
  "1600585154340-be6161a56a0c",
  "1493809842364-78817add7ffb",
  "1556909114-f6e7ad7d3136",
  "1540518614846-7eded433c457",
  "1560185007-cde436f6a4d0",
  "1522098635833-216c03d81fbe",
  "1494203484021-3c454daf695d",
];
const DESCRIPTORS = ["exterior", "living area", "bedroom", "bathroom", "kitchen"];
const PHOTOS_PER_LISTING = 5;
const POOL_STRIDE = 7;
const demoUrl = (id) =>
  `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`;

// Tolerant download: Unsplash ids rot over time, so a single dead id must not
// fail the whole seed. Skip any that fail, but require a minimum valid set and
// abort BEFORE any upload if too few survive — so the seed still never
// half-populates (the guardrail), it just doesn't depend on all 12 being live.
const MIN_VALID_IMAGES = 5;
console.log(`Downloading up to ${DEMO_POOL.length} demo images...`);
const poolBuffers = [];
for (const id of DEMO_POOL) {
  let res;
  try {
    res = await fetch(demoUrl(id));
  } catch (e) {
    console.warn(`  skip ${id}: ${e.message}`);
    continue;
  }
  if (!res.ok) {
    console.warn(`  skip ${id}: HTTP ${res.status}`);
    continue;
  }
  poolBuffers.push(Buffer.from(await res.arrayBuffer()));
}
if (poolBuffers.length < MIN_VALID_IMAGES) {
  console.error(
    `Only ${poolBuffers.length} demo images downloaded; need >= ${MIN_VALID_IMAGES}. ` +
      `Aborting before writing any photos.`,
  );
  process.exit(1);
}
console.log(`Downloaded ${poolBuffers.length} demo images.`);

console.log(`Uploading photos for ${LISTINGS.length} listings...`);
const photoRows = [];
for (let idx = 0; idx < LISTINGS.length; idx++) {
  const l = LISTINGS[idx];
  const listingUuid = uuidv5(l.id, NS_NOOK);
  for (let j = 0; j < PHOTOS_PER_LISTING; j++) {
    const poolIdx = (idx * POOL_STRIDE + j) % poolBuffers.length;
    const photoUuid = uuidv5(`${listingUuid}:${j}`, NS_NOOK);
    const path = `${listingUuid}/${photoUuid}.jpg`;
    const { error: upErr } = await sb.storage
      .from("listing-photos")
      .upload(path, poolBuffers[poolIdx], {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (upErr) {
      console.error(`storage upload failed (${path}): ${upErr.message}`);
      process.exit(1);
    }
    photoRows.push({
      id: photoUuid,
      listing_id: listingUuid,
      storage_path: path,
      alt_text: `${l.title} — ${DESCRIPTORS[j % DESCRIPTORS.length]}`,
      sort_order: j,
    });
  }
}

{
  const { error } = await sb
    .from("listing_photos")
    .upsert(photoRows, { onConflict: "id", ignoreDuplicates: false });
  if (error) {
    console.error(`listing_photos upsert failed: ${error.message}`);
    process.exit(1);
  }
}
console.log(`Upserted ${photoRows.length} listing_photos rows.`);

// ---------- promote draft -> final status ----------
// Now that every listing has photos, flip the originally-available rows back.
// This UPDATE re-enters available, firing the NK001 trigger — which now passes
// because the listing_photos rows exist. The coords CHECK also passes (seed
// available rows carry lat/lng).
console.log(`Promoting ${promoteRows.length} listings to their final status...`);
for (const row of promoteRows) {
  const { error } = await sb
    .from("listings")
    .update({ status: row.status })
    .eq("id", row.id);
  if (error) {
    console.error(`promote ${row.id} -> ${row.status} failed: ${error.message}`);
    process.exit(1);
  }
}

// ---------- id-map artifact ----------
const idMap = {
  namespace: NS_NOOK,
  listings: Object.fromEntries(
    LISTINGS.map((l) => [l.id, { uuid: uuidv5(l.id, NS_NOOK), slug: l.slug }]),
  ),
};

const outPath = resolve(HERE, ".id-map-3bb1.json");
writeFileSync(outPath, JSON.stringify(idMap, null, 2) + "\n", "utf8");
console.log(`Wrote ${outPath}`);

console.log("Seed complete.");
process.exit(0);
