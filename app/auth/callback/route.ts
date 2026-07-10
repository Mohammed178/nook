import { NextResponse } from "next/server";
import { createActionClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

// PKCE landing spot for Supabase auth emails (password recovery today; email
// confirmation links would land here too if auto-confirm is ever turned off).
// Exchanges the one-time code for a session cookie, then forwards to `next`
// (same-origin only, via safeRedirectPath — open-redirect guarded).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createActionClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    console.error(`[auth-callback] code exchange failed: ${error.message}`);
  }

  // Missing/expired/invalid code → back to the request form with a flag the
  // page can surface as "link invalid or expired".
  return NextResponse.redirect(
    new URL("/forgot-password?expired=1", url.origin),
  );
}
