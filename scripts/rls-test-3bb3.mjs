// Phase 3b-B-3 acceptance test (A1–A5).
// Verifies migration 0009: listings.area_id / agent_id are now uuid FKs to
// areas(id) / agents(id) ON DELETE RESTRICT, the row mapper surfaces the UUIDs,
// the legacy-id bridge is gone, and lib/seed/listings.ts is unreachable from app
// code (retained as a script-only data source, see LATE_CATCHES LC-09).
//
//   A1, schema/state stability (behavioural, no pg dep): listings = 18 rows;
//        area_id / agent_id reject a non-uuid string (22P02 => columns are uuid);
//        proven state hashed, stable across re-runs (a NEW baseline, it does
//        NOT match the 3b-B-1/3b-B-2 hashes; the column types changed).
//   A2, row mapper output: lst-001 maps to areaId = uuid(bangsar),
//        agentId = uuid(agent-aisha); both are valid UUIDs, not legacy strings.
//   A3, FK enforcement: UPDATE area_id / agent_id to a uuid absent from the
//        parent table => 23503.
//   A4, ON DELETE RESTRICT: deleting an in-use area / agent => 23503 (the
//        delete is actually attempted; failure proves RESTRICT fires).
//   A5, dead-code grep + file disposition: legacy-id-bridge gone (refs + file);
//        @/lib/seed/listings unreachable from app/components/lib; lib/seed/
//        listings.ts retained on disk; no legacy-prefix tokens in lib/data or
//        lib/types.ts.
//
// Uses the service-role key for setup/proofs ONLY (never app code). No RLS paths
// here, listings RLS was sealed in 3b-B-1 and is out of scope. The failing
// UPDATE/DELETE attempts mutate nothing (each is rejected), so no cleanup.
//
// Pre-req: apply migration 0009 against the local DB before running.
// Run: node --experimental-strip-types --env-file=.env.local scripts/rls-test-3bb3.mjs
// Exit 0 = pass. Exit 1 = first FAIL.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative, sep } from "node:path";
import { rowToListing, LISTING_COLS } from "../lib/data/_row-mappers.ts";

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
const idMap3ba = JSON.parse(readFileSync(resolve(here, ".id-map-3ba.json"), "utf8"));
const idMap3bb1 = JSON.parse(readFileSync(resolve(here, ".id-map-3bb1.json"), "utf8"));

const LST001_SLUG = idMap3bb1.listings["lst-001"].slug; // cosy-studio-bangsar-near-um
const BANGSAR_UUID = idMap3ba.areas["bangsar"].uuid;
const AISHA_UUID = idMap3ba.agents["agent-aisha"].uuid;
// Valid uuid syntax, NOT a seeded area or agent (FK target missing).
const ABSENT_UUID = "deadbeef-dead-4ead-8ead-deaddeadbeef";
// Legacy slug-shaped string => must fail the uuid cast.
const NON_UUID = "bangsar";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const admin = createClient(URL, SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // ----------------------------------------------------------------
  // A1, schema/state stability (behavioural)
  // ----------------------------------------------------------------
  step("A1, listings = 18 rows + area_id/agent_id are uuid (re-run to compare hash)");
  const { count, error: ce } = await admin
    .from("listings")
    .select("*", { count: "exact", head: true });
  if (ce) fail(`listings count: ${ce.message}`);
  if (count !== 18) fail(`expected 18 listings, got ${count}`);

  const colProof = {};
  for (const col of ["area_id", "agent_id"]) {
    const { error } = await admin
      .from("listings")
      .update({ [col]: NON_UUID })
      .eq("slug", LST001_SLUG)
      .select();
    if (!error) fail(`listings.${col} accepted non-uuid "${NON_UUID}", still text?`);
    if (error.code !== "22P02") {
      fail(`${col} non-uuid update: expected 22P02, got ${error.code} (${error.message})`);
    }
    colProof[col] = "uuid";
  }
  const a1hash = djb2(
    `listings:${count}|area_type:${colProof.area_id}|agent_type:${colProof.agent_id}`,
  );
  ok(`listings: 18 rows, area_id/agent_id reject non-uuid (22P02)`);
  ok(`A1 state hash ${a1hash}, re-run this script and compare (new baseline, != 3bb1/3bb2)`);

  // ----------------------------------------------------------------
  // A2, row mapper output sanity
  // ----------------------------------------------------------------
  step("A2, rowToListing surfaces area/agent UUIDs for lst-001");
  const { data: row, error: re } = await admin
    .from("listings")
    .select(LISTING_COLS)
    .eq("slug", LST001_SLUG)
    .single();
  if (re || !row) fail(`fetch ${LST001_SLUG}: ${re?.message}`);
  const listing = rowToListing(row);
  if (listing.areaId !== BANGSAR_UUID) {
    fail(`areaId expected ${BANGSAR_UUID} (bangsar), got ${listing.areaId}`);
  }
  if (listing.agentId !== AISHA_UUID) {
    fail(`agentId expected ${AISHA_UUID} (agent-aisha), got ${listing.agentId}`);
  }
  if (!UUID_RE.test(listing.areaId)) fail(`areaId is not a uuid: ${listing.areaId}`);
  if (!UUID_RE.test(listing.agentId)) fail(`agentId is not a uuid: ${listing.agentId}`);
  ok(`areaId=${listing.areaId} (bangsar), agentId=${listing.agentId} (aisha), both valid UUIDs`);

  // ----------------------------------------------------------------
  // A3, FK enforcement (absent parent => 23503)
  // ----------------------------------------------------------------
  step("A3, FK enforcement: area_id/agent_id absent from parent is rejected");
  for (const [col, parent] of [
    ["area_id", "areas"],
    ["agent_id", "agents"],
  ]) {
    const { error } = await admin
      .from("listings")
      .update({ [col]: ABSENT_UUID })
      .eq("slug", LST001_SLUG)
      .select();
    if (!error) fail(`${col}: update to a uuid absent from ${parent} succeeded, no FK?`);
    if (error.code !== "23503") {
      fail(`${col}: expected 23503 FK violation, got ${error.code} (${error.message})`);
    }
    ok(`${col}: absent ${parent}(id) blocked (23503 "${error.message}")`);
  }

  // ----------------------------------------------------------------
  // A4, ON DELETE RESTRICT (delete is actually attempted)
  // ----------------------------------------------------------------
  step("A4, RESTRICT: deleting an in-use area/agent is blocked");
  {
    const { error: ae } = await admin
      .from("areas")
      .delete()
      .eq("slug", "bangsar")
      .select();
    if (!ae) fail(`DELETE area 'bangsar' SUCCEEDED, RESTRICT not enforced (DB may be damaged)`);
    if (ae.code !== "23503") {
      fail(`area delete: expected 23503 RESTRICT, got ${ae.code} (${ae.message})`);
    }
    ok(`areas: delete of in-use 'bangsar' blocked (23503)`);

    const { error: ge } = await admin
      .from("agents")
      .delete()
      .eq("slug", "aisha-rahman")
      .select();
    if (!ge) fail(`DELETE agent 'aisha-rahman' SUCCEEDED, RESTRICT not enforced (DB may be damaged)`);
    if (ge.code !== "23503") {
      fail(`agent delete: expected 23503 RESTRICT, got ${ge.code} (${ge.message})`);
    }
    ok(`agents: delete of in-use 'aisha-rahman' blocked (23503)`);
  }

  // ----------------------------------------------------------------
  // A5, dead-code grep + file disposition (in-script fs scan)
  // ----------------------------------------------------------------
  step("A5, dead-code grep + file disposition");
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

    const bridgeRefs = []; // gate 1: any legacy-id-bridge reference
    const seedListingRefs = []; // gate 2: any @/lib/seed/listings reference
    const legacyTokens = []; // gate 3: legacy-prefix tokens in lib/data + lib/types.ts
    const inLegacyGrepScope = (rel) =>
      rel.startsWith(`lib${sep}data${sep}`) || rel === join("lib", "types.ts");

    for (const f of files) {
      const rel = relative(root, f);
      const text = readFileSync(f, "utf8");
      if (text.includes("legacy-id-bridge")) bridgeRefs.push(rel);
      if (text.includes("@/lib/seed/listings")) seedListingRefs.push(rel);
      if (inLegacyGrepScope(rel) && /legacy id|lst-|agent-/.test(text)) {
        legacyTokens.push(rel);
      }
    }
    if (bridgeRefs.length) fail(`legacy-id-bridge still referenced in: ${bridgeRefs.join(", ")}`);
    if (seedListingRefs.length) {
      fail(`@/lib/seed/listings still reachable from app code: ${seedListingRefs.join(", ")}`);
    }
    if (legacyTokens.length) {
      fail(`legacy-prefix token in lib/data or lib/types.ts: ${legacyTokens.join(", ")}`);
    }
    ok(`${files.length} files scanned: 0 legacy-id-bridge, 0 @/lib/seed/listings, 0 legacy tokens`);

    // File disposition
    const bridgeFile = join(root, "lib", "data", "legacy-id-bridge.ts");
    if (existsSync(bridgeFile)) fail(`lib/data/legacy-id-bridge.ts still exists on disk`);
    ok(`lib/data/legacy-id-bridge.ts deleted from disk`);

    const seedListingFile = join(root, "lib", "seed", "listings.ts");
    if (!existsSync(seedListingFile)) {
      fail(`lib/seed/listings.ts missing, it must be retained (LC-09 script-only source)`);
    }
    ok(`lib/seed/listings.ts retained on disk (script-only data source, LC-09)`);

    const seedDir = join(root, "lib", "seed");
    if (!existsSync(seedDir)) fail(`lib/seed/ directory missing, must be kept`);
    ok(`lib/seed/ directory retained (reference data: universities/areas/agents/reviews/nearby)`);
  }

  console.log("\nrls-test-3bb3 PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
