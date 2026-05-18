// Phase 3b-A acceptance test.
// Anon-key only — no service-role key.
//
// Covers:
//   A1 — idempotency (hash includes updated_at so no-change upserts that
//        silently churn the row would still show drift)
//   A2 — shape parity vs the seed objects (excluding id, which is the slug
//        post-migration), plus UUID-derivation cross-check via the id-map
//   A3 — RLS: anon SELECT works; anon INSERT / UPDATE / DELETE denied
//
// Pre-req: run `npm run seed:3ba` ONCE before this script (uses service-role
// key from .env.local). This script then assumes the rows already exist.
//
// Run: node --env-file=.env.local --experimental-strip-types scripts/rls-test-3ba.mjs
// Exit 0 = pass. Exit 1 = first FAIL.

import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { AREAS } from "../lib/seed/areas.ts";
import { AGENTS } from "../lib/seed/agents.ts";
// A2 oracle: pure row mappers shared with the app helpers. The helpers
// themselves can't run from a plain Node script (server-only / next/headers),
// so we fetch via anon-key Supabase + run the SAME mapper the helpers use.
// Any drift in mapper output (e.g. id wired to slug instead of uuid) is
// caught here — the test asserts on the Area/Agent shape the app consumes,
// not on the raw column.
import {
  AREA_COLS,
  AGENT_COLS,
  rowToArea,
  rowToAgent,
} from "../lib/data/_row-mappers.ts";

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
const idMap = JSON.parse(readFileSync(resolve(here, ".id-map-3ba.json"), "utf8"));
const NS = idMap.namespace;

// ============================================================
// A1 — idempotency
// Hash incorporates updated_at so a no-change upsert that silently rewrites
// rows would show drift. Caller re-runs the seed and re-runs this script;
// the hash MUST match. (We can't re-seed from here because we don't have the
// service-role key; we hash now, the user re-runs seed and re-runs this and
// compares.)
// ============================================================
step("A1 — idempotency hash (re-run after re-seeding to compare)");
async function tableHash(table) {
  const { data, error } = await sb
    .from(table)
    .select("id, updated_at")
    .order("id");
  if (error) fail(`${table} hash query: ${error.message}`);
  if (!data || data.length === 0) fail(`${table} returned 0 rows — seed not applied?`);
  const concat = data.map((r) => `${r.id}|${r.updated_at}`).join(",");
  // Tiny inline djb2 — node:crypto md5 would work too; we just want a stable digest
  let h = 5381;
  for (const c of concat) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return { rows: data.length, hash: (h >>> 0).toString(16) };
}
{
  const a = await tableHash("areas");
  const g = await tableHash("agents");
  ok(`areas: ${a.rows} rows, hash ${a.hash}`);
  ok(`agents: ${g.rows} rows, hash ${g.hash}`);
  ok(`re-run \`npm run seed:3ba && npm run rls-test:3ba\` and compare hashes`);
}

// ============================================================
// A2 — shape parity (excluding id) + UUID derivation check
// ============================================================
step("A2 — helper-output shape parity vs seed + UUID derivation");
{
  const { data: row, error } = await sb
    .from("areas")
    .select(AREA_COLS)
    .eq("slug", "bangsar")
    .maybeSingle();
  if (error || !row) fail(`fetch area bangsar: ${error?.message ?? "missing"}`);
  const area = rowToArea(row);
  const seed = AREAS.find((a) => a.id === "bangsar");
  if (!seed) fail("seed missing bangsar");
  const expectedUuid = uuidv5("bangsar", NS);
  const checks = [
    ["id (= uuidv5(legacy, NS))", area.id === expectedUuid],
    ["slug", area.slug === "bangsar"],
    ["name", area.name === seed.name],
    ["city", area.city === seed.city],
    ["state", area.state === seed.state],
    ["lat", area.lat === seed.lat],
    ["lng", area.lng === seed.lng],
    [
      "nearbyUniversityIds",
      JSON.stringify(area.nearbyUniversityIds) ===
        JSON.stringify(seed.nearbyUniversityIds),
    ],
    ["vibe", area.vibe === seed.vibe],
  ];
  for (const [k, pass] of checks) if (!pass) fail(`area bangsar helper output: ${k} mismatch`);
  ok(`area bangsar (helper output): id=${area.id}, slug=${area.slug}, all fields match`);
}
{
  const expectedSlug = idMap.agents["agent-aisha"].slug;
  const { data: row, error } = await sb
    .from("agents")
    .select(AGENT_COLS)
    .eq("slug", expectedSlug)
    .maybeSingle();
  if (error || !row) fail(`fetch agent ${expectedSlug}: ${error?.message ?? "missing"}`);
  const agent = rowToAgent(row);
  const seed = AGENTS.find((a) => a.id === "agent-aisha");
  if (!seed) fail("seed missing agent-aisha");
  const expectedUuid = uuidv5("agent-aisha", NS);
  const checks = [
    ["id (= uuidv5(legacy, NS))", agent.id === expectedUuid],
    ["slug", agent.slug === expectedSlug],
    ["name", agent.name === seed.name],
    ["agency", agent.agency === seed.agency],
    ["rating", agent.rating === seed.rating],
    ["reviewCount", agent.reviewCount === seed.reviewCount],
    ["responseTimeMins", agent.responseTimeMins === seed.responseTimeMins],
    ["languages", JSON.stringify(agent.languages) === JSON.stringify(seed.languages)],
    ["avatarUrl", agent.avatarUrl === seed.avatarUrl],
    ["whatsapp", agent.whatsapp === seed.whatsapp],
    ["phone", agent.phone === seed.phone],
    ["email", agent.email === seed.email],
    ["verified", agent.verified === seed.verified],
    ["yearsActive", agent.yearsActive === seed.yearsActive],
    ["bio", agent.bio === seed.bio],
    ["bovaepLicence", agent.bovaepLicence === seed.bovaepLicence],
  ];
  for (const [k, pass] of checks) if (!pass) fail(`agent ${expectedSlug} helper output: ${k} mismatch`);
  ok(`agent ${expectedSlug} (helper output): id=${agent.id}, slug=${agent.slug}, all fields match`);
}

// ============================================================
// A3 — RLS: anon read OK, anon writes denied
// ============================================================
step("A3 — RLS: anon SELECT works on areas/agents");
{
  // Fetch ALL rows (no .limit) and assert count matches seeded total. A
  // restrictive policy that leaked only a subset would pass a limit(1) check
  // but fail this one. Expected counts come from idMap so seed-data changes
  // don't silently invalidate the assertion.
  const { data: a, error: ae } = await sb.from("areas").select("id");
  if (ae) fail(`anon SELECT areas: ${ae.message}`);
  const expectedAreas = Object.keys(idMap.areas).length;
  if (!a || a.length !== expectedAreas) fail(`anon SELECT areas: expected ${expectedAreas} rows, got ${a?.length ?? 0}`);
  ok(`anon SELECT areas: ${a.length} rows visible`);

  const { data: g, error: ge } = await sb.from("agents").select("id");
  if (ge) fail(`anon SELECT agents: ${ge.message}`);
  const expectedAgents = Object.keys(idMap.agents).length;
  if (!g || g.length !== expectedAgents) fail(`anon SELECT agents: expected ${expectedAgents} rows, got ${g?.length ?? 0}`);
  ok(`anon SELECT agents: ${g.length} rows visible`);
}

step("A3 — RLS: anon writes denied");
async function assertDenied(table, op, action) {
  const { data, error } = await action();
  const rows = data?.length ?? 0;
  if (rows !== 0) fail(`LEAK: anon ${op} on ${table} returned ${rows} row(s)`);
  if (error && !/permission|policy|row-level|violates/i.test(error.message)) {
    fail(`anon ${op} on ${table} errored but not with RLS message: ${error.message}`);
  }
  ok(`anon ${op} on ${table}: blocked (${error ? `"${error.message}"` : "0 rows"})`);
}
{
  await assertDenied("areas", "INSERT", () =>
    sb
      .from("areas")
      .insert({
        id: "00000000-0000-0000-0000-000000000001",
        slug: "rls-probe",
        name: "x",
        city: "x",
        state: "x",
        lat: 0,
        lng: 0,
      })
      .select(),
  );
  await assertDenied("areas", "UPDATE", () =>
    sb.from("areas").update({ name: "hack" }).eq("slug", "bangsar").select(),
  );
  await assertDenied("areas", "DELETE", () =>
    sb.from("areas").delete().eq("slug", "bangsar").select(),
  );
  await assertDenied("agents", "INSERT", () =>
    sb
      .from("agents")
      .insert({
        id: "00000000-0000-0000-0000-000000000002",
        slug: "rls-probe",
        name: "x",
        rating: 1.0,
        review_count: 0,
        response_time_mins: 0,
        languages: [],
        avatar_url: "x",
        whatsapp: "x",
        verified: false,
        years_active: 0,
      })
      .select(),
  );
  await assertDenied("agents", "UPDATE", () =>
    sb.from("agents").update({ name: "hack" }).eq("slug", idMap.agents["agent-aisha"].slug).select(),
  );
  await assertDenied("agents", "DELETE", () =>
    sb.from("agents").delete().eq("slug", idMap.agents["agent-aisha"].slug).select(),
  );
}

console.log("\nrls-test-3ba PASSED");
process.exit(0);
