import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;
  const isAccountRoute = pathname.startsWith("/account");
  // Agent surfaces that require a session. /agents/register and the public
  // /agents/[slug] profiles stay open, gate only the pending page and the
  // (future, 4b) dashboard prefix. Status-aware redirects (approved/student →
  // away) live in the pending page itself, avoiding a per-request DB read here.
  // When dashboard routes land, "pending agent → /agents/pending" gating needs
  // the agent's status: query agents by user_id after updateSession returns.
  const isAgentGated =
    pathname === "/agents/pending" ||
    pathname === "/agents/verify" ||
    pathname.startsWith("/agents/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");

  if ((isAccountRoute || isAgentGated || isAdminRoute) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  // Admin gate (L-4a2.12), layer 1 of defence-in-depth. JWT-only, no DB read,
  // preserving the per-request contract above. Non-admin authenticated user →
  // home. The layout's notFound() (app/admin/layout.tsx) is the route-invisibility
  // layer. This supersedes LOCK-4.9's "404 at middleware" per the 4a-2 Q-block
  // (PHASE4_ARCHITECTURE.md LOCK-4.8/4.9 carry a SUPERSEDED note). Claim checked
  // inline rather than via isAdmin() from lib/auth.ts, importing that module
  // would pull next/headers cookies() into the middleware bundle (L-4a2.3).
  if (isAdminRoute && user && user.app_metadata?.role !== "admin") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
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
