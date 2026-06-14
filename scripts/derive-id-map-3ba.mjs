// Pure derivation of scripts/.id-map-3ba.json from lib/seed/{areas,agents}.ts.
// No DB connection. The full seed (scripts/seed-3ba.mjs) writes the same file
// using identical derivation logic, single source of truth is the seed script,
// this helper exists so the artifact can be regenerated without service-role
// credentials (e.g. on CI, or to verify determinism).
//
// Run: node --experimental-strip-types scripts/derive-id-map-3ba.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { v5 as uuidv5 } from "uuid";
import { AREAS } from "../lib/seed/areas.ts";
import { AGENTS } from "../lib/seed/agents.ts";

const NS_NOOK = "b6e7f7a4-9c1e-5c0a-9b3d-3f6f4f7e1c2a";

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
  const slugs = new Map();
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

const areaSlugByLegacy = new Map(AREAS.map((a) => [a.id, a.id]));
const agentSlugByLegacy = deriveAgentSlugs(AGENTS);

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
