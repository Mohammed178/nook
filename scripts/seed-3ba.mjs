// Phase 3b-A seed.
// Reads lib/seed/{areas,agents}.ts (no .mjs mirror — single source of truth),
// derives deterministic UUIDv5 ids + slugs, upserts into Supabase using the
// service-role key, and writes scripts/.id-map-3ba.json for the in-app bridge.
//
// Run: node --experimental-strip-types --env-file=.env.local scripts/seed-3ba.mjs
// Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Service-role key is never imported by app code.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";
import { AREAS } from "../lib/seed/areas.ts";
import { AGENTS } from "../lib/seed/agents.ts";

// Frozen namespace. DO NOT CHANGE — every id is derived from this constant.
// Hand-edited from a v4 to a v5-shape value; functionally any fixed 128-bit
// value works as a uuidv5 namespace.
const NS_NOOK = "b6e7f7a4-9c1e-5c0a-9b3d-3f6f4f7e1c2a";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
for (const [k, v] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: URL, SUPABASE_SERVICE_ROLE_KEY: SRK })) {
  if (!v) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveAgentSlugs(agents) {
  const taken = new Set();
  const slugs = new Map(); // legacyId -> slug
  for (const a of agents) {
    const base = slugify(a.name);
    let slug = base;
    let n = 2;
    while (taken.has(slug)) {
      slug = `${base}-${n}`;
      n += 1;
    }
    taken.add(slug);
    slugs.set(a.id, slug);
  }
  return slugs;
}

const sb = createClient(URL, SRK, { auth: { persistSession: false } });

// ---------- areas ----------
const areaSlugByLegacy = new Map(AREAS.map((a) => [a.id, a.id])); // slug = legacy id
const areaRows = AREAS.map((a) => ({
  id: uuidv5(a.id, NS_NOOK),
  slug: a.id,
  name: a.name,
  city: a.city,
  state: a.state,
  lat: a.lat,
  lng: a.lng,
  nearby_university_ids: a.nearbyUniversityIds,
  vibe: a.vibe ?? null,
}));

console.log(`Upserting ${areaRows.length} areas...`);
{
  const { error } = await sb
    .from("areas")
    .upsert(areaRows, { onConflict: "id", ignoreDuplicates: false });
  if (error) {
    console.error(`areas upsert failed: ${error.message}`);
    process.exit(1);
  }
}

// ---------- agents ----------
const agentSlugByLegacy = deriveAgentSlugs(AGENTS);
const agentRows = AGENTS.map((a) => ({
  id: uuidv5(a.id, NS_NOOK),
  slug: agentSlugByLegacy.get(a.id),
  name: a.name,
  agency: a.agency ?? null,
  rating: a.rating,
  review_count: a.reviewCount,
  response_time_mins: a.responseTimeMins,
  languages: a.languages,
  avatar_url: a.avatarUrl,
  whatsapp: a.whatsapp,
  phone: a.phone ?? null,
  email: a.email ?? null,
  verified: a.verified,
  years_active: a.yearsActive,
  bio: a.bio ?? null,
  bovaep_licence: a.bovaepLicence ?? null,
}));

console.log(`Upserting ${agentRows.length} agents...`);
{
  const { error } = await sb
    .from("agents")
    .upsert(agentRows, { onConflict: "id", ignoreDuplicates: false });
  if (error) {
    console.error(`agents upsert failed: ${error.message}`);
    process.exit(1);
  }
}

// ---------- id-map artifact ----------
const idMap = {
  namespace: NS_NOOK,
  areas: Object.fromEntries(
    AREAS.map((a) => [a.id, { uuid: uuidv5(a.id, NS_NOOK), slug: areaSlugByLegacy.get(a.id) }]),
  ),
  agents: Object.fromEntries(
    AGENTS.map((a) => [a.id, { uuid: uuidv5(a.id, NS_NOOK), slug: agentSlugByLegacy.get(a.id) }]),
  ),
};

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, ".id-map-3ba.json");
writeFileSync(outPath, JSON.stringify(idMap, null, 2) + "\n", "utf8");
console.log(`Wrote ${outPath}`);

console.log("Seed complete.");
process.exit(0);
