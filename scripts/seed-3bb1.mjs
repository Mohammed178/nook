// Phase 3b-B-1 seed.
// Reads lib/seed/listings.ts (no .mjs mirror — single source of truth),
// derives deterministic UUIDv5 ids (reusing the 3b-A NS_NOOK namespace), keeps
// slugs verbatim, resolves photos (galleryFor already runs at module load, so
// l.photos is the resolved string[]), upserts into Supabase using the
// service-role key, and writes scripts/.id-map-3bb1.json for the in-app bridge.
//
// area_id / agent_id are written as the legacy string ids (decision #4) — no
// FK in this checkpoint.
//
// Run: node --experimental-strip-types --env-file=.env.local scripts/seed-3bb1.mjs
// Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Service-role key is never imported by app code.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";
import { LISTINGS } from "../lib/seed/listings.ts";

// Frozen namespace — reused from 3b-A. DO NOT introduce a new one.
const NS_NOOK = "b6e7f7a4-9c1e-5c0a-9b3d-3f6f4f7e1c2a";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
for (const [k, v] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: URL, SUPABASE_SERVICE_ROLE_KEY: SRK })) {
  if (!v) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

const sb = createClient(URL, SRK, { auth: { persistSession: false } });

const listingRows = LISTINGS.map((l) => ({
  id: uuidv5(l.id, NS_NOOK),
  slug: l.slug,
  title: l.title,
  type: l.type,
  status: l.status,
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
  area_id: l.areaId,
  city: l.city,
  state: l.state,
  lat: l.lat,
  lng: l.lng,
  nearby_university_ids: l.nearbyUniversityIds,
  walk_mins_to_campus: l.walkMinsToCampus ?? null,
  metres_to_campus: l.metresToCampus ?? null,
  amenities: l.amenities,
  photos: l.photos,
  description: l.description,
  agent_id: l.agentId,
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

// ---------- id-map artifact ----------
const idMap = {
  namespace: NS_NOOK,
  listings: Object.fromEntries(
    LISTINGS.map((l) => [l.id, { uuid: uuidv5(l.id, NS_NOOK), slug: l.slug }]),
  ),
};

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, ".id-map-3bb1.json");
writeFileSync(outPath, JSON.stringify(idMap, null, 2) + "\n", "utf8");
console.log(`Wrote ${outPath}`);

console.log("Seed complete.");
process.exit(0);
