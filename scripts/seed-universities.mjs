// Seed the universities table (migration 0022) from the existing constants.
// Reads lib/seed/universities.ts (core fields) + university-content.ts
// (editorial prose/photo), derives the same deterministic UUIDv5 id used
// everywhere else (NS_NOOK), keeps slug = legacy id so /universities/<id> URLs
// and the ?university=<id> filter are unchanged, and upserts. Idempotent.
//
// Run: node --experimental-strip-types --env-file=.env.local scripts/seed-universities.mjs
// Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Service-role key is never imported by app code.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";
import { UNIVERSITIES } from "../lib/seed/universities.ts";
import { UNIVERSITY_CONTENT } from "../lib/seed/university-content.ts";

// Frozen namespace — identical to scripts/seed-3ba.mjs so ids line up with
// areas/agents. DO NOT CHANGE.
const NS_NOOK = "b6e7f7a4-9c1e-5c0a-9b3d-3f6f4f7e1c2a";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
for (const [k, v] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: URL,
  SUPABASE_SERVICE_ROLE_KEY: SRK,
})) {
  if (!v) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}

const sb = createClient(URL, SRK, { auth: { persistSession: false } });

const rows = UNIVERSITIES.map((u) => {
  const c = UNIVERSITY_CONTENT[u.id];
  if (!c) {
    console.error(`No UNIVERSITY_CONTENT for ${u.id}; refusing to seed a blank.`);
    process.exit(1);
  }
  return {
    id: uuidv5(u.id, NS_NOOK),
    slug: u.id, // slug = legacy id (URL-stable)
    name: u.name,
    short_name: u.shortName,
    city: u.city,
    state: u.state,
    lat: u.lat,
    lng: u.lng,
    student_count: u.studentCount ?? null,
    campus_type: u.campusType ?? null,
    description: c.description,
    transit: c.transit,
    campus_features: c.campusFeatures,
    website: c.website,
    photo_url: c.photo,
    photo_file: c.photoFile,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };
});

console.log(`Upserting ${rows.length} universities...`);
{
  const { error } = await sb
    .from("universities")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: false });
  if (error) {
    console.error(`universities upsert failed: ${error.message}`);
    process.exit(1);
  }
}

const idMap = {
  namespace: NS_NOOK,
  universities: Object.fromEntries(
    UNIVERSITIES.map((u) => [u.id, { uuid: uuidv5(u.id, NS_NOOK), slug: u.id }]),
  ),
};
const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, ".id-map-universities.json");
writeFileSync(outPath, JSON.stringify(idMap, null, 2) + "\n", "utf8");
console.log(`Wrote ${outPath}`);

console.log("Seed complete.");
process.exit(0);
