// Pure derivation of scripts/.id-map-3bb1.json from lib/seed/listings.ts.
// No DB connection. The full seed (scripts/seed-3bb1.mjs) writes the same file
// using identical derivation logic, single source of truth is the seed script,
// this helper exists so the artifact can be regenerated without service-role
// credentials (e.g. on CI, or before `next build` so the in-app bridge import
// of .id-map-3bb1.json resolves).
//
// Run: node --experimental-strip-types scripts/derive-id-map-3bb1.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { v5 as uuidv5 } from "uuid";
import { LISTINGS } from "../lib/seed/listings.ts";

// Frozen namespace, reused from 3b-A. DO NOT introduce a new one.
const NS_NOOK = "b6e7f7a4-9c1e-5c0a-9b3d-3f6f4f7e1c2a";

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
