import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client. Bypasses RLS. Import only from app/admin/**/actions.ts.
// Enforced by `npm run lint:service-role-containment` (L-4a2.11). Uses the
// service-role key (NOT NEXT_PUBLIC_), so it must never reach the client bundle,
// the `server-only` import above is the bundle airbag; the lint is the location
// guard. Constructed via @supabase/supabase-js (not @supabase/ssr): service-role
// has no session/cookie to manage.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
