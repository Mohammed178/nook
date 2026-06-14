// Phase 3a RLS acceptance test.
// No service-role key. Two sign-ins as User A bracket one sign-in as User B.
//
// Setup:
//   1. Copy .env.test.local.example → .env.test.local
//   2. Fill values (Supabase URL + anon key + 2 users' emails/passwords)
//   3. As User A in the app: save a listing, save a search, open a listing
//      detail (populates favourites + saved_searches + recent_views)
//   4. User B = a fresh second account, nothing saved
//
// Run: node --env-file=.env.local scripts/rls-test.mjs
// Exit 0 = pass. Exit 1 = leak (with FAIL: reason).

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const A_EMAIL = process.env.RLS_TEST_USER_A_EMAIL;
const A_PASSWORD = process.env.RLS_TEST_USER_A_PASSWORD;
const B_EMAIL = process.env.RLS_TEST_USER_B_EMAIL;
const B_PASSWORD = process.env.RLS_TEST_USER_B_PASSWORD;

for (const [k, v] of Object.entries({ URL, ANON, A_EMAIL, A_PASSWORD, B_EMAIL, B_PASSWORD })) {
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

function newClient() {
  return createClient(URL, ANON, { auth: { persistSession: false } });
}

async function signIn(email, password, label) {
  const sb = newClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) fail(`sign-in (${label}): ${error.message}`);
  return { sb, userId: data.user.id };
}

// ---------- Step 1: positive control as User A ----------
step("Sign in as User A and verify A's rows exist (positive control)");
const a1 = await signIn(A_EMAIL, A_PASSWORD, "A pre-check");
const aId = a1.userId;

const { data: profileA, error: profileAErr } = await a1.sb
  .from("profiles")
  .select("id, display_name")
  .eq("id", aId)
  .maybeSingle();
if (profileAErr || !profileA) fail(`A profile row not visible: ${profileAErr?.message ?? "missing"}`);
const originalDisplayName = profileA.display_name;

const { data: favsA, error: favsAErr } = await a1.sb
  .from("favourites")
  .select("id, listing_id")
  .eq("user_id", aId);
if (favsAErr) fail(`A favourites query: ${favsAErr.message}`);
if (!favsA || favsA.length === 0) fail("A has zero favourites, populate before running");
const witnessFavouriteId = favsA[0].id;
const witnessListingId = favsA[0].listing_id;

const { data: searchA, error: searchAErr } = await a1.sb
  .from("saved_searches")
  .select("id, name")
  .eq("user_id", aId);
if (searchAErr) fail(`A saved_searches query: ${searchAErr.message}`);
if (!searchA || searchA.length === 0) fail("A has zero saved_searches, populate before running");
const witnessSearchId = searchA[0].id;
const witnessSearchName = searchA[0].name;

const { data: recentA, error: recentAErr } = await a1.sb
  .from("recent_views")
  .select("id")
  .eq("user_id", aId);
if (recentAErr) fail(`A recent_views query: ${recentAErr.message}`);
if (!recentA || recentA.length === 0) fail("A has zero recent_views, populate before running");

console.log(`  positive control OK: profile + ${favsA.length} favs + ${searchA.length} searches + ${recentA.length} recents`);

await a1.sb.auth.signOut();

// ---------- Step 2: read attacks as User B ----------
step("Sign in as User B and attempt to read A's rows");
const b = await signIn(B_EMAIL, B_PASSWORD, "B attacker");
if (b.userId === aId) fail("User B has the same id as User A, provide distinct accounts");

const readTargets = [
  { table: "profiles", col: "id" },
  { table: "favourites", col: "user_id" },
  { table: "recent_views", col: "user_id" },
  { table: "saved_searches", col: "user_id" },
];
for (const t of readTargets) {
  const { data, error } = await b.sb.from(t.table).select("*").eq(t.col, aId);
  if (error) fail(`unexpected error on B reading ${t.table}: ${error.message}`);
  if ((data?.length ?? 0) !== 0) fail(`LEAK: B saw ${data.length} row(s) in ${t.table} owned by A`);
  console.log(`  read ${t.table}: 0 rows (ok)`);
}

// ---------- Step 3: write attacks as User B ----------
step("As User B, attempt to mutate A's rows");

// UPDATE: assert zero rows affected via .select() returning clause
{
  const { data, error } = await b.sb
    .from("profiles")
    .update({ display_name: "hack-by-B" })
    .eq("id", aId)
    .select();
  if (error && !/permission|policy|row-level/i.test(error.message)) {
    fail(`unexpected update error: ${error.message}`);
  }
  const rows = data?.length ?? 0;
  if (rows !== 0) fail(`LEAK: B's update touched ${rows} A-profile row(s)`);
  console.log(`  update profiles: 0 rows returned (ok)`);
}

// DELETE: assert zero rows affected
{
  const { data, error } = await b.sb
    .from("saved_searches")
    .delete()
    .eq("user_id", aId)
    .select();
  if (error && !/permission|policy|row-level/i.test(error.message)) {
    fail(`unexpected delete error: ${error.message}`);
  }
  const rows = data?.length ?? 0;
  if (rows !== 0) fail(`LEAK: B's delete removed ${rows} A-saved_search row(s)`);
  console.log(`  delete saved_searches: 0 rows returned (ok)`);
}

// INSERT spoofing A's user_id: must error with RLS/permission. Do NOT trust count.
{
  const { data, error } = await b.sb
    .from("favourites")
    .insert({ user_id: aId, listing_id: witnessListingId })
    .select();
  if (!error) {
    fail(`LEAK: B's insert under A's user_id succeeded (returned ${data?.length ?? 0} row(s))`);
  }
  if (!/permission|policy|row-level|violates/i.test(error.message)) {
    fail(`B's insert errored but not with an RLS/permission message: ${error.message}`);
  }
  console.log(`  insert favourites spoofing A: blocked with "${error.message}" (ok)`);
}

await b.sb.auth.signOut();

// ---------- Step 4: re-verify A's data intact ----------
step("Sign back in as User A and confirm rows untouched");
const a2 = await signIn(A_EMAIL, A_PASSWORD, "A post-check");

const { data: profileAAfter } = await a2.sb
  .from("profiles")
  .select("display_name")
  .eq("id", aId)
  .maybeSingle();
if (!profileAAfter) fail("A's profile row missing after B's attempts");
if (profileAAfter.display_name !== originalDisplayName) {
  fail(`A's display_name mutated: "${originalDisplayName}" → "${profileAAfter.display_name}"`);
}
console.log(`  A profile display_name intact: "${originalDisplayName}"`);

const { data: favAfter } = await a2.sb
  .from("favourites")
  .select("id")
  .eq("id", witnessFavouriteId)
  .maybeSingle();
if (!favAfter) fail(`A's witness favourite ${witnessFavouriteId} disappeared`);
console.log(`  A favourite intact`);

const { data: searchAfter } = await a2.sb
  .from("saved_searches")
  .select("id, name")
  .eq("id", witnessSearchId)
  .maybeSingle();
if (!searchAfter) fail(`A's witness saved_search ${witnessSearchId} disappeared`);
if (searchAfter.name !== witnessSearchName) {
  fail(`A's saved_search name mutated: "${witnessSearchName}" → "${searchAfter.name}"`);
}
console.log(`  A saved_search intact`);

await a2.sb.auth.signOut();

console.log("\nRLS test PASSED, RLS holds and A's data is intact");
process.exit(0);
