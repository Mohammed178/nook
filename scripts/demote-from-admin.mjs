// Phase 4a-2 — demote a user from admin (L-4a2.10).
// Clears app_metadata.role on the target auth user via the service-role admin
// API. Idempotent: a no-op (exit 0) if the user is not an admin.
//
// Run: npm run demote-from-admin -- <email>
// Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Own service-role client (see promote-to-admin.mjs header for why not the
// lib/supabase/admin.ts helper). app_metadata is merged by GoTrue; role is set to
// null so the isAdmin() check (role === 'admin') no longer matches.
//
// No explicit session/token revocation step (H1 decision A). Nulling the role is
// effective on the demoted admin's NEXT request: every admin gate round-trips
// `supabase.auth.getUser()` (middleware.ts:33 reads user.app_metadata.role from
// the updateSession/getUser result; lib/auth.ts isAdmin() likewise), and getUser
// hits GoTrue /user which returns server-fresh app_metadata. Nothing trusts a
// locally-decoded JWT claim. The live access token still CARRIES role=admin until
// its TTL (~1h), but no code path reads that decoded claim, so there is no admin
// access to revoke. This is NOT a session revocation — it relies on getUser
// freshness. `auth.admin.signOut(jwt)` is not usable here: it needs the target
// user's live JWT, which this CLI (which only has the user id, looked up by email)
// does not possess. See LATE_CATCHES: if any gate moves to getSession()/getClaims()
// (local decode), a demoted admin's stale claim resurfaces for <= token TTL.
//
// Exit handling: process.exitCode + return, never process.exit() after a network
// call — forcing exit mid-socket-close trips a libuv assertion on Windows
// (UV_HANDLE_CLOSING). See promote-to-admin.mjs.

import { createClient } from "@supabase/supabase-js";

async function findUserByEmail(sb, target) {
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error(`listUsers failed: ${error.message}`);
      return { error: true };
    }
    const hit = data.users.find((u) => u.email === target);
    if (hit) return { user: hit };
    if (data.users.length < 200) return { user: null };
  }
}

// Count current admins (A-1 last-admin guard). GoTrue admin listUsers has no
// server-side app_metadata filter, so paginate and count role === 'admin' in JS.
// Pagination + end-condition mirror findUserByEmail (page/perPage=200, stop when a
// page returns < perPage). Returns null on a listUsers error so the caller can fail
// closed (a wrong count must never silently defeat the guard).
async function countAdmins(sb) {
  let count = 0;
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error(`listUsers failed: ${error.message}`);
      return null;
    }
    for (const u of data.users) {
      if (u.app_metadata?.role === "admin") count++;
    }
    if (data.users.length < 200) return count;
  }
}

async function main() {
  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
  for (const [k, v] of Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: URL,
    SUPABASE_SERVICE_ROLE_KEY: SRK,
  })) {
    if (!v) {
      console.error(`Missing env: ${k}`);
      return 1;
    }
  }

  const args = process.argv.slice(2).filter((a) => a !== "--");
  const force = args.includes("--force");
  const email = args.find((a) => a !== "--force");
  if (!email) {
    console.error("Usage: npm run demote-from-admin -- <email> [--force]");
    return 1;
  }

  const sb = createClient(URL, SRK, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { user, error: lookupError } = await findUserByEmail(sb, email);
  if (lookupError) return 1;
  if (!user) {
    console.error(`No user with email ${email}`);
    return 1;
  }

  if (user.app_metadata?.role !== "admin") {
    console.log(`${email} is not an admin (no-op).`);
    return 0;
  }

  // A-1 — last-admin lockout guard. The target IS an admin (checked above), so the
  // post-demote admin count = current count - 1. Refuse if that would hit zero (no
  // one could reach /admin; recovery needs a service-role re-promote). "Self" isn't
  // defined here — the CLI runs as the service-role key-holder with no admin session
  // identity — so the meaningful guard is "don't drop to zero admins". --force overrides.
  if (!force) {
    const adminCount = await countAdmins(sb);
    if (adminCount === null) return 1; // count failed → fail closed, do not demote
    if (adminCount <= 1) {
      console.error(
        `Refusing to demote ${email}: it is the last admin (post-demote admin count would be 0). ` +
          `This would lock everyone out of /admin until a service-role re-promote. ` +
          `Re-run with --force to override.`,
      );
      return 1;
    }
  }

  const { error } = await sb.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, role: null },
  });
  if (error) {
    console.error(`demote failed: ${error.message}`);
    return 1;
  }

  console.log(`Demoted ${email} from admin.`);
  return 0;
}

process.exitCode = await main();
