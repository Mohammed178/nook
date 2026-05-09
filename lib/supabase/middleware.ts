import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware Supabase client.
 *
 * Refreshes the session on every request and returns the response object
 * with updated cookies. Caller should:
 *   1. await updateSession(request) to get { response, user }
 *   2. inspect user for route gating decisions
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

  // IMPORTANT: getUser must be called to refresh the session.
  // Do not remove this even if the user value is unused at this layer.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
