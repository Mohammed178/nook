"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createActionClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, isLocale } from "./config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persist the chosen locale. Writes the cookie (fast path read by the root
 * layout) and revalidates the whole tree so every server-rendered string
 * re-resolves in the new language. The cross-device mirror to
 * profiles.preferred_language is deferred via after() so the blocking UI
 * transition only waits on the cookie write + re-render, not two network
 * round-trips (auth.getUser + the UPDATE).
 */
export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");

  // Off the critical path: runs after the response is sent, so the language
  // switch doesn't block on auth + DB. Best-effort; RLS confines the write to
  // the caller's own row, and a failure here must not affect the cookie switch.
  after(async () => {
    const supabase = await createActionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ preferred_language: locale })
        .eq("id", user.id);
    }
  });
}
