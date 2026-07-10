"use server";

import { createActionClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";

export async function updatePasswordAction(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const password = String(formData.get("password") ?? "");
  const t = (await getDictionary()).auth;
  if (password.length < 8) return { error: t.passwordMin };

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The recovery session from /auth/callback authenticates this call; without
  // one (direct visit, expired link) there is nothing to update.
  if (!user) return { error: t.resetLinkInvalid };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: true };
}
