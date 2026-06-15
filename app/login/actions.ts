"use server";

import { cookies } from "next/headers";
import { createActionClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/server";

export async function signInAction(
  formData: FormData,
): Promise<{ error?: string } | undefined> {
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
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("preferred_language")
      .eq("id", data.user.id)
      .maybeSingle();
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

  return undefined;
}
