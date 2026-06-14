// Targeted cleanup of LEAKED rls-test fixtures (Phase 4c-B1 follow-up).
//
// Why this exists: rls-test-3bb2 / 3bb3 assert a pristine, freshly-seeded DB
// (recent_views empty; exactly 18 listings). An interrupted test run can leave
// residue behind, an ephemeral auth user + its agent + its listings, and the
// 3bb2 cascade-probe rows. This script removes ONLY that residue, by the
// harness's ephemeral signature, and NOTHING else.
//
// HARD SAFETY RULES:
//   * Service-role (trusted .mjs zone). Never imported by app code.
//   * DRY-RUN BY DEFAULT, prints what it would delete and exits. Pass --apply
//     to actually delete. The operator reviews the dry-run first.
//   * Scoped strictly to the ephemeral signature below. It refuses to delete any
//     listing whose id is one of the 18 seed UUIDv5 ids (belt-and-braces guard).
//   * It deliberately does NOT delete "any listing not in the seed set", that
//     would also nuke a real agent draft created during manual UI testing. If a
//     non-ephemeral extra row remains after this, it is real data, not residue:
//     investigate, don't widen this script.
//
// FK ordering: agents.user_id -> auth.users and listings.agent_id -> agents are
// ON DELETE RESTRICT (migrations 0009/0010); listing_photos.listing_id ->
// listings is CASCADE. So we delete listings (demote available->draft first to
// avoid the last-photo trigger), then agents, then auth users. recent_views /
// favourites / saved_searches referencing a deleted listing or user cascade out.
//
// Run: node --experimental-strip-types --env-file=.env.local scripts/cleanup-ephemeral.mjs            (dry run)
//      node --experimental-strip-types --env-file=.env.local scripts/cleanup-ephemeral.mjs --apply    (delete)
// Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5 } from "uuid";
import { LISTINGS } from "../lib/seed/listings.ts";

const NS_NOOK = "b6e7f7a4-9c1e-5c0a-9b3d-3f6f4f7e1c2a";
const PROBE_LISTING = "11111111-1111-4111-8111-111111111111"; // 3bb2 cascade probe
const APPLY = process.argv.includes("--apply");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
for (const [k, v] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: URL, SUPABASE_SERVICE_ROLE_KEY: SRK })) {
  if (!v) {
    console.error(`Missing env: ${k}`);
    process.exit(1);
  }
}
const sb = createClient(URL, SRK, { auth: { persistSession: false } });

// The 18 seed listing ids, NEVER delete these.
const SEED_IDS = new Set(LISTINGS.map((l) => uuidv5(l.id, NS_NOOK)));

// Ephemeral email signatures used by the harnesses.
const EPHEMERAL_EMAIL = [
  /^ephemeral-.*@nook\.test$/i, // 4b / 4c
  /^rls-3bb2-.*@example\.com$/i, // 3bb2
];
const isEphemeralEmail = (email) =>
  !!email && EPHEMERAL_EMAIL.some((re) => re.test(email));

function tag(s) {
  return APPLY ? s : `[dry-run] would ${s}`;
}

// ---------- 1) ephemeral agents (slug eph-*, EPH-TEST licence) ----------
const { data: agents, error: agentsErr } = await sb
  .from("agents")
  .select("id, slug, user_id, bovaep_licence")
  .or("slug.like.eph-%,bovaep_licence.eq.EPH-TEST");
if (agentsErr) {
  console.error(`query ephemeral agents: ${agentsErr.message}`);
  process.exit(1);
}
const ephemeralAgentIds = agents.map((a) => a.id);
const agentUserIds = agents.map((a) => a.user_id).filter(Boolean);

// ---------- 2) ephemeral listings ----------
// By owning ephemeral agent, OR by slug/title signature, OR the 3bb2 probe id.
const listingFilters = [
  ephemeralAgentIds.length ? `agent_id.in.(${ephemeralAgentIds.join(",")})` : null,
  "slug.like.eph-%",
  "title.like.Ephemeral%",
  `id.eq.${PROBE_LISTING}`,
]
  .filter(Boolean)
  .join(",");

const { data: listings, error: listingsErr } = await sb
  .from("listings")
  .select("id, slug, title, status, agent_id")
  .or(listingFilters);
if (listingsErr) {
  console.error(`query ephemeral listings: ${listingsErr.message}`);
  process.exit(1);
}

// Seed-id guard: a seed listing must never be in the deletion set.
const guarded = listings.filter((l) => SEED_IDS.has(l.id));
if (guarded.length > 0) {
  console.error(
    `ABORT: ephemeral signature matched ${guarded.length} SEED listing(s): ` +
      guarded.map((l) => `${l.slug} (${l.id})`).join(", ") +
      `. This should be impossible, refusing to delete. Investigate the signature.`,
  );
  process.exit(1);
}
const listingIds = listings.map((l) => l.id);

// ---------- 3) ephemeral auth users (email signature + agent owners) ----------
const ephemeralUserIds = new Set(agentUserIds);
{
  let page = 1;
  // listUsers is paginated; walk until a short page.
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error(`listUsers page ${page}: ${error.message}`);
      process.exit(1);
    }
    for (const u of data.users) {
      if (isEphemeralEmail(u.email)) ephemeralUserIds.add(u.id);
    }
    if (data.users.length < 200) break;
    page += 1;
  }
}

// ---------- plan summary ----------
console.log(`Ephemeral cleanup ${APPLY ? "(APPLY)" : "(dry run, no deletes)"}`);
console.log(`  agents:   ${agents.length}`);
console.log(`  listings: ${listings.length}`);
console.log(`  users:    ${ephemeralUserIds.size}`);
for (const l of listings) {
  console.log(`    listing ${l.slug} [${l.status}] ${l.id}`);
}
if (listings.length === 0 && agents.length === 0 && ephemeralUserIds.size === 0) {
  console.log("Nothing matched the ephemeral signature. DB is clean.");
  process.exit(0);
}
if (!APPLY) {
  console.log("\nDry run only. Re-run with --apply to delete.");
  process.exit(0);
}

// ---------- 4) delete in FK-safe order: listings -> agents -> users ----------
// 4a) demote available listings to draft so the last-photo trigger never fires,
//     then hard-delete (listing_photos cascade with the parent).
for (const l of listings) {
  if (l.status !== "draft") {
    const { error } = await sb.from("listings").update({ status: "draft" }).eq("id", l.id);
    if (error) {
      console.error(`demote ${l.id}: ${error.message}`);
      process.exit(1);
    }
  }
}
if (listingIds.length) {
  const { error } = await sb.from("listings").delete().in("id", listingIds);
  if (error) {
    console.error(`delete listings: ${error.message}`);
    process.exit(1);
  }
  console.log(tag(`deleted ${listingIds.length} listings`));
}

// 4b) agents (now unreferenced by listings)
if (ephemeralAgentIds.length) {
  const { error } = await sb.from("agents").delete().in("id", ephemeralAgentIds);
  if (error) {
    console.error(`delete agents: ${error.message}`);
    process.exit(1);
  }
  console.log(tag(`deleted ${ephemeralAgentIds.length} agents`));
}

// 4c) auth users (now unreferenced by agents); cascades recent_views/favourites.
let deletedUsers = 0;
for (const uid of ephemeralUserIds) {
  const { error } = await sb.auth.admin.deleteUser(uid);
  if (error) {
    console.error(`delete user ${uid}: ${error.message}`);
    process.exit(1);
  }
  deletedUsers += 1;
}
console.log(tag(`deleted ${deletedUsers} auth users`));

console.log("Cleanup complete.");
process.exit(0);
