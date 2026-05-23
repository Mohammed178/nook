import { createClient } from "@/lib/supabase/server";
import { getListingResolver } from "@/lib/data/listings";
import type { Listing } from "@/lib/types";

const RECENT_LIMIT = 20;

export interface RecentlyViewedListing {
  listing: Listing;
  viewedAt: string;
}

/**
 * Server-only. Returns hydrated recently-viewed listings for the current user,
 * most-recent first, capped to the last 20 unique listings (Phase 3a locked).
 * Drops rows whose listing_id resolves to no current listing (defensive — no DB FK).
 */
export async function getRecentlyViewed(): Promise<RecentlyViewedListing[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("recent_views")
    .select("listing_id, viewed_at")
    .eq("user_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(RECENT_LIMIT);

  if (error || !data) return [];

  const resolve = await getListingResolver();
  const out: RecentlyViewedListing[] = [];
  for (const row of data) {
    const listing = resolve(row.listing_id as string);
    if (!listing) continue;
    out.push({ listing, viewedAt: row.viewed_at as string });
  }
  return out;
}
