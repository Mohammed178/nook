import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware Supabase client.
 *
 * Refreshes the session on every request and returns the response object
 * with updated cookies. Caller should:
 *   1. await updateSession(request) to get { response, claims }
 *   2. inspect claims (verified JWT payload, null when signed out) for route
 *      gating decisions
 *   3. return the (possibly redirected) response
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: an auth call must be made here so expired sessions refresh.
  // getClaims() verifies the JWT locally via JWKS (asymmetric keys) — no
  // per-request Auth round-trip like the old getUser(); legacy secret = fallback.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  return { response, claims };
}
