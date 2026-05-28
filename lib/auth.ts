import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

/**
 * Admin claim check (L-4a2.1). The role lives at app_metadata.role === 'admin'
 * (app_metadata namespace only — the user cannot self-modify it). Pure function,
 * no client/cookie access, so middleware (which has the JWT-decoded user from
 * updateSession but no cookies() in the getCurrentUser shape) and server actions
 * can both reuse it. Middleware itself checks the claim inline to avoid importing
 * this module (which would pull next/headers into the middleware bundle).
 */
export function isAdmin(
  user: { app_metadata?: Record<string, unknown> } | null,
): boolean {
  return user?.app_metadata?.role === "admin";
}

/**
 * Server-side getUser. Returns null if not signed in.
 * Reads display_name from profiles table; falls back to email local-part.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ??
    (user.email ? user.email.split("@")[0] : "Account");

  return {
    id: user.id,
    email: user.email ?? "",
    displayName,
    // Populated from the auth.getUser() call above — no second round-trip.
    isAdmin: isAdmin(user),
  };
}
