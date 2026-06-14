// Phase 4a-2, promote a user to admin (L-4a2.10).
// Sets app_metadata.role = 'admin' on the target auth user via the service-role
// admin API. Idempotent: a no-op (exit 0) if the user is already admin.
//
// Run: npm run promote-to-admin -- <email>
//   (= node --experimental-strip-types --env-file=.env.local scripts/promote-to-admin.mjs <email>)
// Env required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Constructs its own service-role client rather than importing
// lib/supabase/admin.ts: that module is `server-only` (would throw here) and the
// containment lint forbids importing it outside app/admin/. Same pattern as
// scripts/seed-3ba.mjs.
//
// Exit handling: set process.exitCode and return, never process.exit() after a
// network call. Forcing exit while undici (supabase-js fetch) sockets are mid-close
// trips a libuv assertion on Windows (UV_HANDLE_CLOSING). Idle sockets drain on
// their own keep-alive timeout, then the process exits cleanly.
//
// Session note (LOCK-4.10): a JWT minted before promotion does not carry the
// claim until the session refreshes. No forced re-login at MVP, the admin
// signs out/in (or waits for refresh) to pick up the claim.

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

  const email = process.argv.slice(2).filter((a) => a !== "--")[0];
  if (!email) {
    console.error("Usage: npm run promote-to-admin -- <email>");
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

  if (user.app_metadata?.role === "admin") {
    console.log(`${email} is already admin (no-op).`);
    return 0;
  }

  const { error } = await sb.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, role: "admin" },
  });
  if (error) {
    console.error(`promote failed: ${error.message}`);
    return 1;
  }

  console.log(`Promoted ${email} to admin.`);
  return 0;
}

process.exitCode = await main();
