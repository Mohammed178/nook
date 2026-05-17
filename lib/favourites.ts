import { createClient } from "@/lib/supabase/server";
import { LISTING_BY_ID } from "@/lib/seed/listings";
import type { Listing } from "@/lib/types";

/**
 * Server-only. Returns IDs of listings the current user has favourited.
 * Empty array when signed-out or query fails.
 */
export async function getFavouriteIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("favourites")
    .select("listing_id")
    .eq("user_id", user.id);

  if (error || !data) return [];
  return data.map((row) => row.listing_id as string);
}

export interface SavedListing {
  listing: Listing;
  savedAt: string;
}

/**
 * Server-only. Returns hydrated saved listings for the current user, newest
 * first. Drops rows whose listing_id is no longer in the seed (defensive —
 * no DB FK; seed is source of truth).
 */
export async function getSavedListings(): Promise<SavedListing[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("favourites")
    .select("listing_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const out: SavedListing[] = [];
  for (const row of data) {
    const listing = LISTING_BY_ID[row.listing_id as string];
    if (!listing) continue;
    out.push({ listing, savedAt: row.created_at as string });
  }
  return out;
}
