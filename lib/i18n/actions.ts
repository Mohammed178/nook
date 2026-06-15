"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "./config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persist the chosen locale. Writes the cookie (fast path read by the root
 * layout) and, when signed in, mirrors it to profiles.preferred_language so the
 * choice survives across devices and future logins. Revalidates the whole tree
 * so every server-rendered string re-resolves in the new language.
 */
export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // Best-effort; RLS confines the write to the caller's own row. A failure
    // here (e.g. column not yet migrated) must not break the cookie switch.
    await supabase
      .from("profiles")
      .update({ preferred_language: locale })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
}
