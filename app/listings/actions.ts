"use server";

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/server";
import { LISTINGS } from "@/lib/seed/listings";

const VALID_LISTING_IDS = new Set(LISTINGS.map((l) => l.id));

export type ToggleResult =
  | { saved: boolean; signedIn: true }
  | { error: string; signedIn?: boolean };

/**
 * Toggle favourite for the current user + listingId.
 * Idempotent: insert if missing, delete if present.
 * Validates listingId against seed (no FK in DB; seed = source of truth).
 */
export async function toggleFavouriteAction(
  listingId: string,
): Promise<ToggleResult> {
  if (!VALID_LISTING_IDS.has(listingId)) {
    return { error: "Unknown listing." };
  }

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in.", signedIn: false };
  }

  const { data: existing } = await supabase
    .from("favourites")
    .select("id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favourites")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message, signedIn: true };
    revalidatePath("/account/saved");
    return { saved: false, signedIn: true };
  }

  const { error } = await supabase
    .from("favourites")
    .insert({ user_id: user.id, listing_id: listingId });
  if (error) return { error: error.message, signedIn: true };
  revalidatePath("/account/saved");
  return { saved: true, signedIn: true };
}
