// Account-deletion flow harness (0035 feature seal).
//
// The delete action itself is a "use server" function (next/cache imports) and
// cannot be invoked from a .mjs script — this harness plants realistic fixtures
// BEFORE a manual (or browser-driven) UI pass, then asserts ZERO residue after.
//
//   --setup            create an ephemeral student and an ephemeral APPROVED
//                      agent (agents row + published listing + real storage
//                      objects in all four buckets + agent_documents row +
//                      favourite/saved-search/recent-view rows). Prints login
//                      credentials and writes ids to scripts/.account-deletion-fixture.json
//   --assert           read the fixture file and assert nothing remains: no
//                      auth users, no agents row (live OR soft-deleted), no
//                      listings/photos/videos/documents rows, empty storage
//                      folders, and account_deletions grew by 2. Exit 1 on any
//                      residue.
//   --assert-student / --assert-agent   assert one identity only (+1 audit row
//                      minimum), for testing the flows separately.
//
// Fixtures use the ephemeral-…@nook.test signature, so an interrupted run can
// be reaped by scripts/cleanup-ephemeral.mjs (plus manual storage cleanup).
//
// Run: node --experimental-strip-types --env-file=.env.local scripts/flow-test-account-deletion.mjs --setup
// Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { plantAvailableListing } from "./rls-harness.mjs";

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

const admin = createClient(URL, SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STATE_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  ".account-deletion-fixture.json",
);

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`  ok: ${msg}`);
}

// 1x1 transparent PNG — a real object for every bucket (content-type checks
// are per-bucket MIME allowlists; listing-videos gets a webm-typed blob).
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==",
  "base64",
);

async function upload(bucket, path, body, contentType) {
  const { error } = await admin.storage
    .from(bucket)
    .upload(path, body, { contentType, upsert: true });
  if (error) fail(`upload ${bucket}/${path}: ${error.message}`);
}

async function makeUser(label) {
  const email = `ephemeral-${label}-${randomUUID().slice(0, 8)}@nook.test`;
  const password = `Eph-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data?.user) fail(`createUser ${label}: ${error?.message}`);
  return { id: data.user.id, email, password };
}

// Returns null (with a warning) while 0035 is not applied yet — the audit
// insert in the action is best-effort by design, so the rest of the flow is
// still assertable.
async function auditCount() {
  // NOT head:true — a missing table 404s with a null body there and looks like
  // count 0; a real select surfaces the PGRST205 error while 0035 is unapplied.
  const { count, error } = await admin
    .from("account_deletions")
    .select("id", { count: "exact" })
    .limit(1);
  if (error || count === null) {
    console.warn(
      `  warn: account_deletions unavailable (0035 applied?): ${error?.message ?? "no count"}`,
    );
    return null;
  }
  return count;
}

// ---------------------------------------------------------------- setup ----
async function setup() {
  // Any live area works for the listing FK.
  const { data: area, error: areaErr } = await admin
    .from("areas")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (areaErr || !area) fail(`need one areas row: ${areaErr?.message ?? "none found"}`);

  // Student: profile (trigger) + avatar object + favourite/saved-search/recent-view.
  const student = await makeUser("student");
  const studentAvatar = `${student.id}/${randomUUID()}.png`;
  await upload("avatars", studentAvatar, PNG_1PX, "image/png");
  await admin.from("profiles").update({ avatar_url: studentAvatar }).eq("id", student.id);

  // Agent: auth user + APPROVED agents row + published listing + media objects
  // + verification document.
  const agentUser = await makeUser("agent");
  const agentId = randomUUID();
  const slug = `eph-${randomUUID().slice(0, 8)}`;
  const { error: agentErr } = await admin.from("agents").insert({
    id: agentId,
    user_id: agentUser.id,
    slug,
    name: "Ephemeral Delete-Test Agent",
    agency: "Test Agency",
    rating: 0,
    review_count: 0,
    response_time_mins: 60,
    languages: ["en"],
    avatar_url: "/agent-placeholder.svg",
    whatsapp: "+60000000000",
    phone: "+60000000000",
    email: `${slug}@nook.test`,
    bovaep_licence: `EPH-${randomUUID().slice(0, 8).toUpperCase()}`,
    years_active: 0,
    status: "approved",
  });
  if (agentErr) fail(`insert agent: ${agentErr.message}`);

  const createdListings = [];
  const { listingId, storagePath: photoPath } = await plantAvailableListing({
    admin,
    areaUuid: area.id,
    agentId,
    createdListings,
    fail,
  });
  await upload("listing-photos", photoPath, PNG_1PX, "image/png");

  const videoPath = `${listingId}/${randomUUID()}.webm`;
  await upload("listing-videos", videoPath, PNG_1PX, "video/webm");
  const { error: videoErr } = await admin.from("listing_videos").insert({
    listing_id: listingId,
    storage_path: videoPath,
    title: "Ephemeral walkthrough",
    sort_order: 0,
  });
  if (videoErr) fail(`insert listing_video: ${videoErr.message}`);

  const docPath = `${agentId}/${randomUUID()}.png`;
  await upload("agent-documents", docPath, PNG_1PX, "image/png");
  const { error: docErr } = await admin.from("agent_documents").insert({
    agent_id: agentId,
    doc_type: "ren_cert",
    storage_path: docPath,
  });
  if (docErr) fail(`insert agent_document: ${docErr.message}`);

  // Student engagement rows on the agent's listing (all must cascade away).
  for (const [table, row] of [
    ["favourites", { user_id: student.id, listing_id: listingId }],
    ["recent_views", { user_id: student.id, listing_id: listingId }],
    [
      "saved_searches",
      { user_id: student.id, name: "Ephemeral search", query_params: { q: "eph" } },
    ],
  ]) {
    const { error } = await admin.from(table).insert(row);
    if (error) fail(`insert ${table}: ${error.message}`);
  }

  const state = {
    student: { id: student.id, email: student.email },
    agentUser: { id: agentUser.id, email: agentUser.email },
    agentId,
    listingId,
    auditBaseline: await auditCount(),
  };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  console.log("Fixture planted. Log in and delete each account via the UI:\n");
  console.log(`  STUDENT  ${student.email}  /  ${student.password}`);
  console.log(`           simple confirm dialog on /account/profile`);
  console.log(`  AGENT    ${agentUser.email}  /  ${agentUser.password}`);
  console.log(`           phrase + password dialog; listing ${listingId} must vanish\n`);
  console.log(`State written to ${STATE_FILE}. Afterwards run with --assert.`);
}

// --------------------------------------------------------------- assert ----
async function userExists(idOrEmail) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`listUsers: ${error.message}`);
    if (data.users.some((u) => u.id === idOrEmail || u.email === idOrEmail)) return true;
    if (data.users.length < 200) return false;
    page += 1;
  }
}

async function assertNoRows(table, col, val, label) {
  const { data, error } = await admin.from(table).select("id").eq(col, val).limit(1);
  if (error) fail(`${table} query: ${error.message}`);
  if ((data ?? []).length > 0) fail(`${label}: residual ${table} row`);
  ok(`no ${table} rows (${label})`);
}

async function assertFolderEmpty(bucket, folder) {
  const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 10 });
  if (error) fail(`storage list ${bucket}/${folder}: ${error.message}`);
  const objects = (data ?? []).filter((o) => o.id); // folders come back with null id
  if (objects.length > 0) {
    fail(`${bucket}/${folder} not empty: ${objects.map((o) => o.name).join(", ")}`);
  }
  ok(`${bucket}/${folder} empty`);
}

async function assertIdentity(state, which) {
  if (which === "student") {
    if (await userExists(state.student.id)) fail("student auth user still exists");
    ok("student auth user gone");
    await assertNoRows("profiles", "id", state.student.id, "student profile");
    await assertNoRows("favourites", "user_id", state.student.id, "student favourites");
    await assertNoRows("saved_searches", "user_id", state.student.id, "student saved_searches");
    await assertNoRows("recent_views", "user_id", state.student.id, "student recent_views");
    await assertFolderEmpty("avatars", state.student.id);
  } else {
    if (await userExists(state.agentUser.id)) fail("agent auth user still exists");
    ok("agent auth user gone");
    await assertNoRows("agents", "user_id", state.agentUser.id, "agents row (any status)");
    await assertNoRows("listings", "id", state.listingId, "listing");
    await assertNoRows("listing_photos", "listing_id", state.listingId, "listing photos");
    await assertNoRows("listing_videos", "listing_id", state.listingId, "listing videos");
    await assertNoRows("agent_documents", "agent_id", state.agentId, "agent documents");
    await assertNoRows("profiles", "id", state.agentUser.id, "agent profile");
    await assertFolderEmpty("listing-photos", state.listingId);
    await assertFolderEmpty("listing-videos", state.listingId);
    await assertFolderEmpty("agent-documents", state.agentId);
    await assertFolderEmpty("avatars", state.agentUser.id);
  }
}

async function runAssert(mode) {
  let state;
  try {
    state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    fail(`no fixture state at ${STATE_FILE} — run --setup first`);
  }

  const expected = mode === "both" ? 2 : 1;
  if (mode === "both" || mode === "student") await assertIdentity(state, "student");
  if (mode === "both" || mode === "agent") await assertIdentity(state, "agent");

  const audits = await auditCount();
  if (audits === null || state.auditBaseline === null) {
    console.warn("  warn: audit-row assertion skipped (0035 not applied)");
  } else if (audits < state.auditBaseline + expected) {
    fail(
      `account_deletions did not grow by ${expected} (baseline ${state.auditBaseline}, now ${audits})`,
    );
  } else {
    ok(`account_deletions grew by >= ${expected}`);
  }

  console.log("\nPASS: zero residue.");
}

// ----------------------------------------------------------------- main ----
const arg = process.argv[2];
if (arg === "--setup") await setup();
else if (arg === "--assert") await runAssert("both");
else if (arg === "--assert-student") await runAssert("student");
else if (arg === "--assert-agent") await runAssert("agent");
else {
  console.error(
    "Usage: flow-test-account-deletion.mjs --setup | --assert | --assert-student | --assert-agent",
  );
  process.exit(1);
}
