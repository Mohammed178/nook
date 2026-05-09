import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
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
  };
}
