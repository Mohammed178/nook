"use server";

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/server";

export async function renameSavedSearchAction(
  id: string,
  newName: string,
): Promise<{ ok?: true; error?: string }> {
  const name = newName.trim();
  if (name.length === 0) return { error: "Name is required." };
  if (name.length > 100) return { error: "Name is too long (max 100)." };

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

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
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account/searches");
  return { ok: true };
}
