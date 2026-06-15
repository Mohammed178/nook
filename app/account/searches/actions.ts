"use server";

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/server";

export async function renameSavedSearchAction(
  id: string,
  newName: string,
): Promise<{ ok?: true; error?: string }> {
  const e = (await getDictionary()).errors;
  const name = newName.trim();
  if (name.length === 0) return { error: e.nameRequired };
  if (name.length > 100) return { error: e.nameTooLong };

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: e.notSignedIn };

  const { error } = await supabase
    .from("saved_searches")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account/searches");
  return { ok: true };
}

export async function deleteSavedSearchAction(
  id: string,
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: (await getDictionary()).errors.notSignedIn };

  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account/searches");
  return { ok: true };
}
