"use server";

import { headers } from "next/headers";
import { createActionClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";

export async function requestPasswordResetAction(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const t = (await getDictionary()).auth;
  if (!email) return { error: t.emailRequired };

  // The recovery email lands on /auth/callback, which exchanges the code for a
  // session and forwards to /reset-password. Origin comes from the request so
  // the same code works on localhost and the deployed host — the target origin
  // must also be allowlisted in Supabase Auth → URL Configuration.
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createActionClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always report success — never reveal whether an account exists for the
  // address (account-enumeration guard). Supabase rate-limits the sends.
  return { ok: true };
}
