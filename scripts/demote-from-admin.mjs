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
    console.error("Usage: npm run demote-from-admin -- <email>");
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
