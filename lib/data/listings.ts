import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  LISTING_COLS,
  rowToListing,
  type ListingRow,
} from "@/lib/data/_row-mappers";
import type { Gender, Listing } from "@/lib/types";
import { getAreaBySlug } from "@/lib/data/areas";
import {
  applyFilters,
  applySort,
  defaultSort,
  type ListingSearchParams,
} from "@/lib/listings-search";
import {
  isNearCampus,
  nearestCampus,
  NEAR_CAMPUS_RADIUS_KM,
} from "@/lib/distance";

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
//
// 3b-B-3: the `?area=` param carries the area slug (URL-stable contract), but
// Listing.areaId is now the area UUID (migration 0009). Resolve slug → UUID
// here, at the data seam, so applyFilters' equality stays correct without
// touching lib/listings-search.ts or the URL contract.
export async function getFilteredListings(
  p: ListingSearchParams,
  viewerGender?: Gender,
): Promise<Listing[]> {
  const filterParams = p.area
    ? { ...p, area: await areaSlugToUuid(p.area) }
    : p;
  const filtered = applyFilters(await getAllListings(), filterParams, viewerGender);
  return applySort(filtered, defaultSort(p), p.university);
}

// Maps an `?area=` slug to its area UUID. Falls back to the slug itself when no
// area matches (yields an empty filter result — correct for an unknown area).
async function areaSlugToUuid(slug: string): Promise<string> {
  const area = await getAreaBySlug(slug);
  return area?.id ?? slug;
}

export async function getSimilarListings(
  current: Listing,
  limit = 4,
): Promise<Listing[]> {
  const all = await getAllListings();
  const candidates = all.filter((l) => l.id !== current.id);

  // Compute-don't-claim (4c-B2, answer B): "similar" = within
  // NEAR_CAMPUS_RADIUS_KM of the current listing's nearest campus, computed from
  // coordinates. Null-coord candidates are skipped (isNearCampus → false). This
  // overlapping-membership set mirrors the old shared-university intent without
  // a stored tag.
  const nearest = nearestCampus(current.lat, current.lng);
  const sameUni = nearest
    ? candidates.filter((l) =>
        isNearCampus(l.lat, l.lng, nearest.uniId, NEAR_CAMPUS_RADIUS_KM),
      )
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
