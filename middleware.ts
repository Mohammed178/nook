import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isAccountRoute = pathname.startsWith("/account");
  // Agent surfaces that require a session. /agents/register and the public
  // /agents/[slug] profiles stay open — gate only the pending page and the
  // (future, 4b) dashboard prefix. Status-aware redirects (approved/student →
  // away) live in the pending page itself, avoiding a per-request DB read here.
  // When dashboard routes land, "pending agent → /agents/pending" gating needs
  // the agent's status: query agents by user_id after updateSession returns.
  const isAgentGated =
    pathname === "/agents/pending" || pathname.startsWith("/agents/dashboard");

  if ((isAccountRoute || isAgentGated) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
