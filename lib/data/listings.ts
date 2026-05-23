import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  LISTING_COLS,
  rowToListing,
  type ListingRow,
} from "@/lib/data/_row-mappers";
import type { Gender, Listing } from "@/lib/types";
import {
  applyFilters,
  applySort,
  defaultSort,
  type ListingSearchParams,
} from "@/lib/listings-search";

// THE fetch seam (Option A). Today: fetch every row and let the unchanged
// in-memory applyFilters / applySort do the work. The listings table is
// seed-sized so this is cheap. If listing count grows large, swap the internals
// here from "fetch all" to "fetch filtered" WITHOUT touching components or the
// search-params logic — see LATE_CATCHES LC-06.
export async function getAllListings(): Promise<Listing[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("listings").select(LISTING_COLS);
  if (error || !data) return [];
  return (data as ListingRow[]).map(rowToListing);
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("listings")
    .select(LISTING_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToListing(data as ListingRow);
}

// Resolver for favourites / recent_views, which store Listing.id (the UUID).
// Builds a UUID-keyed map over all listings; returns undefined for an id absent
// from the table (defensive — callers drop unresolved rows). As of migration
// 0008 the listing_id columns are a UUID FK to listings(id), so stored values
// are guaranteed to reference a real listing.
export async function getListingResolver(): Promise<
  (id: string) => Listing | undefined
> {
  const listings = await getAllListings();
  const byId = new Map(listings.map((l) => [l.id, l]));
  return (id) => byId.get(id);
}

// Relocated from lib/listings-search.ts (Phase 3b-B-1, decision Q1). Body is
// byte-identical to the original; only the data source (LISTINGS → fetched
// array) and the async/await wrapping changed. The pure applyFilters /
// applySort / defaultSort helpers stay in lib/listings-search.ts untouched.
export async function getFilteredListings(
  p: ListingSearchParams,
  viewerGender?: Gender,
): Promise<Listing[]> {
  const filtered = applyFilters(await getAllListings(), p, viewerGender);
  return applySort(filtered, defaultSort(p), p.university);
}

export async function getSimilarListings(
  current: Listing,
  limit = 4,
): Promise<Listing[]> {
  const all = await getAllListings();
  const primaryUniId = current.nearbyUniversityIds[0];
  const candidates = all.filter((l) => l.id !== current.id);

  const sameUni = primaryUniId
    ? candidates.filter((l) => l.nearbyUniversityIds.includes(primaryUniId))
    : [];

  const ranked = [...sameUni].sort(
    (a, b) =>
      Math.abs(a.priceMonthly - current.priceMonthly) -
      Math.abs(b.priceMonthly - current.priceMonthly),
  );

  if (ranked.length >= limit) return ranked.slice(0, limit);

  // Fallback: same area
  const sameArea = candidates
    .filter(
      (l) => l.areaId === current.areaId && !ranked.includes(l),
    )
    .sort(
      (a, b) =>
        Math.abs(a.priceMonthly - current.priceMonthly) -
        Math.abs(b.priceMonthly - current.priceMonthly),
    );

  const merged = [...ranked, ...sameArea];
  if (merged.length >= limit) return merged.slice(0, limit);

  // Final fallback: newest other listings
  const remaining = candidates
    .filter((l) => !merged.includes(l))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return [...merged, ...remaining].slice(0, limit);
}
