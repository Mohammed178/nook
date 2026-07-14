import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env";

/**
 * Service-role client for test seeding/teardown only. Same pattern as
 * scripts/rls-test-*.mjs: constructed here rather than importing
 * lib/supabase/admin.ts (that module is `server-only` and containment-linted
 * to app/admin/).
 */
export function adminClient(): SupabaseClient {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !srk) {
    throw new Error(
      "E2E setup needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }
  return createClient(url, srk, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
