import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAgentByUserId } from "@/lib/data/agents";
import { publicAvatarUrl } from "@/lib/data/_row-mappers";
import type { AgentStatus } from "@/lib/types";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  /** Resolved public avatar URL, or undefined if the user has not set one. The
   * DB stores a storage path; this is already resolved for <img src>. */
  avatarUrl?: string;
  isAdmin: boolean;
  /** Agent verification status, undefined if the caller has no agents row
   * (i.e. a student). Resolved via the same RLS read client. */
  agentStatus?: AgentStatus;
  /** Agency name for the role label; undefined if no agent row. */
  agencyName?: string;
}

/**
 * Admin claim check (L-4a2.1). The role lives at app_metadata.role === 'admin'
 * (app_metadata namespace only, the user cannot self-modify it). Pure function,
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
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name ??
    (user.email ? user.email.split("@")[0] : "Account");
  const avatarUrl = profile?.avatar_url
    ? publicAvatarUrl(profile.avatar_url)
    : undefined;

  // One indexed lookup on agents by user_id (RLS read client). Folded into the
  // existing per-render DB work; reuses the user above, no second auth.getUser().
  // undefined for students (no agents row). The JWT-claim optimisation that would
  // remove this query is deferred (LC-18).
  const agent = await getAgentByUserId(user.id);

  return {
    id: user.id,
    email: user.email ?? "",
    displayName,
    avatarUrl,
    // Populated from the auth.getUser() call above, no second round-trip.
    isAdmin: isAdmin(user),
    agentStatus: agent?.status,
    agencyName: agent?.agency,
  };
});
