import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  LISTING_COLS,
  rowToListing,
  type ListingRow,
} from "@/lib/data/_row-mappers";
import { listingUuidForLegacyId } from "@/lib/data/legacy-id-bridge";
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

// Resolver for favourites / recent_views, which store Listing.id. Post-3b-B-1
// that is the UUID, so new rows key by UUID; pre-3b-B-1 rows hold the legacy
// "lst-NNN" id, which we translate via the committed id-map (legacy → uuid)
// so existing saved/recent rows still hydrate through the transition. The
// table column itself is untouched here — 3b-B-2 converts it to a UUID FK and
// migrates any remaining legacy values.
export async function getListingResolver(): Promise<
  (idOrLegacy: string) => Listing | undefined
> {
  const listings = await getAllListings();
  const byId = new Map(listings.map((l) => [l.id, l]));
  return (idOrLegacy) => {
    const direct = byId.get(idOrLegacy);
    if (direct) return direct;
    const uuid = listingUuidForLegacyId(idOrLegacy);
    return uuid ? byId.get(uuid) : undefined;
  };
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
