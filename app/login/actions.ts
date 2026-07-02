"use server";

import { cookies } from "next/headers";
import { createActionClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/server";

// Post-login destination for agent accounts. Students get no destination
// (undefined) and the form falls back to its default. Queried here — not in
// middleware — so the DB read happens once at sign-in, not per request.
// Soft-deleted (withdrawn) agents are treated as students: no agent surface
// should greet them.
//
// `force`: an UNVERIFIED (pending/rejected) agent must land on the status page
// even when the login carried a ?redirect deep-link — otherwise an agent
// bounced off any auth-gated page signs in and never sees their application
// state. Approved agents keep deep-links (dashboard is only the default).
async function agentDestination(
  supabase: Awaited<ReturnType<typeof createActionClient>>,
  userId: string,
): Promise<{ redirectTo: string; force: boolean } | undefined> {
  const { data } = await supabase
    .from("agents")
    .select("status, deleted_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || data.deleted_at) return undefined;
  if (data.status === "approved") {
    return { redirectTo: "/agents/dashboard", force: false };
  }
  // pending + rejected both land on the status page; it renders the right copy.
  return { redirectTo: "/agents/pending", force: true };
}

export async function signInAction(
  formData: FormData,
): Promise<
  { error?: string; redirectTo?: string; forceRedirect?: boolean } | undefined
> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    const dict = await getDictionary();
    return { error: dict.auth.emailPasswordRequired };
  }

  const supabase = await createActionClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Seed the locale cookie from the account's saved preference so the language
  // follows the user across devices and future logins (the cookie is the fast
  // path the root layout reads). Best-effort: a missing column or null value
  // simply leaves the existing cookie in place.
  let dest: { redirectTo: string; force: boolean } | undefined;
  if (data.user) {
    const [{ data: profile }, agentDest] = await Promise.all([
      supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", data.user.id)
        .maybeSingle(),
      agentDestination(supabase, data.user.id),
    ]);
    dest = agentDest;
    const pref = profile?.preferred_language;
    if (isLocale(pref)) {
      const store = await cookies();
      store.set(LOCALE_COOKIE, pref, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
  }

  return dest
    ? { redirectTo: dest.redirectTo, forceRedirect: dest.force }
    : undefined;
}
