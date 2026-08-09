import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import {
  LISTING_COLS,
  rowToListing,
  type ListingRow,
} from "@/lib/data/_row-mappers";
import type { Gender, Listing, ListingType } from "@/lib/types";
import { getAreaBySlug } from "@/lib/data/areas";
import {
  applyFilters,
  applySort,
  defaultSort,
  type ListingSearchParams,
} from "@/lib/listings-search";
import {
  buildUniIndex,
  isNearCampus,
  nearestCampus,
  NEAR_CAMPUS_RADIUS_KM,
} from "@/lib/distance";
import { getAllUniversities } from "@/lib/data/universities";

// THE fetch seam (Option A). Browse/search now fetches DB-filtered via
// fetchListingsFiltered (LC-06 executed); this fetch-all remains for whole-set
// consumers (home rails, area/university pages, resolver, similar, stats).
// unstable_cache: the public listings set changes only on agent create/edit/
// publish/photo/coords mutations. Cache it across requests via the cookie-free
// public client (RLS exposes the same public rows to anon; gender filtering is
// applied in-memory downstream, not via the session). Busted on those mutations
// via revalidateTag("listings"); 300s TTL backstop.
export const getAllListings = unstable_cache(
  async (): Promise<Listing[]> => {
    const sb = createPublicClient();
    const { data, error } = await sb.from("listings").select(LISTING_COLS);
    if (error || !data) return [];
    return (data as ListingRow[]).map(rowToListing);
  },
  ["all-listings"],
  { tags: ["listings"], revalidate: 300 },
);

// cache(): same duplication as getAreaBySlug — generateMetadata and the page
// body both fetch this slug. Per-request only; the cookie client keeps this out
// of unstable_cache.
export const getListingBySlug = cache(async (slug: string): Promise<Listing | null> => {
  const sb = await createClient();
  const { data, error } = await sb
    .from("listings")
    .select(LISTING_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return rowToListing(data as ListingRow);
});

// Resolver for favourites / recent_views, which store Listing.id (the UUID).
// Builds a UUID-keyed map over all listings; returns undefined for an id absent
// from the table (defensive, callers drop unresolved rows). As of migration
// 0008 the listing_id columns are a UUID FK to listings(id), so stored values
// are guaranteed to reference a real listing.
export async function getListingResolver(): Promise<
  (id: string) => Listing | undefined
> {
  const listings = await getAllListings();
  const byId = new Map(listings.map((l) => [l.id, l]));
  return (id) => byId.get(id);
}

// Sargable subset of ListingSearchParams (LC-06). Fixed field order + sorted
// arrays make JSON.stringify a canonical cache key. q and university are
// absent by design: they stay in-memory and must not multiply cache keys.
interface DbFilterKey {
  priceMin?: number;
  priceMax?: number;
  areaUuid?: string;
  type?: ListingType[];
  beds?: number;
  furnished?: true;
  moveInBy?: string;
  amenities?: string[];
  gender?: Gender;
}

// Cached per filter combo (tag "listings", same bust + TTL as getAllListings).
// Each predicate is never stricter than its applyFilters twin, so this only
// over-fetches; the downstream applyFilters pass keeps semantics identical.
const fetchListingsFiltered = unstable_cache(
  async (keyJson: string): Promise<Listing[]> => {
    const k = JSON.parse(keyJson) as DbFilterKey;
    const sb = createPublicClient();
    let q = sb.from("listings").select(LISTING_COLS);
    if (k.priceMin != null) q = q.gte("price_monthly", k.priceMin);
    if (k.priceMax != null) q = q.lte("price_monthly", k.priceMax);
    if (k.areaUuid) q = q.eq("area_id", k.areaUuid);
    if (k.type && k.type.length > 0) q = q.in("type", k.type);
    if (k.beds != null) q = q.gte("bedrooms", k.beds);
    if (k.furnished) q = q.eq("furnishing", "full");
    if (k.moveInBy) q = q.lte("available_from", k.moveInBy);
    if (k.gender) q = q.eq("gender_preference", k.gender);
    if (k.amenities && k.amenities.length > 0)
      q = q.contains("amenities", k.amenities);
    const { data, error } = await q;
    if (error || !data) return [];
    return (data as ListingRow[]).map(rowToListing);
  },
  ["filtered-listings"],
  { tags: ["listings"], revalidate: 300 },
);

// Relocated from lib/listings-search.ts (3b-B-1); since LC-06 the pure helpers
// run on a DB-prefiltered set, output unchanged. 3b-B-3: `?area=` carries the
// slug; resolved to UUID here so applyFilters' equality stays correct.
export async function getFilteredListings(
  p: ListingSearchParams,
  viewerGender?: Gender,
): Promise<Listing[]> {
  // Build the live campus index (0022) so the ?university= filter and distance
  // sort include admin-added campuses, not just the seed ten. Fetched only when
  // a campus actually drives the result (filter set or distance sort) to avoid a
  // needless round-trip on a plain price/area browse.
  const needsUnis = p.university != null || defaultSort(p) === "distance";
  const idx = needsUnis ? buildUniIndex(await getAllUniversities()) : undefined;
  const filterParams = p.area
    ? { ...p, area: await areaSlugToUuid(p.area) }
    : p;
  // Mirror of applyFilters' genderApplies: the gender predicate only reaches
  // the DB query (and the cache key) when it would actually filter in-memory.
  const genderApplies = viewerGender !== undefined && p.genderOverride !== "off";
  const key: DbFilterKey = {
    priceMin: filterParams.priceMin,
    priceMax: filterParams.priceMax,
    areaUuid: filterParams.area,
    type: filterParams.type ? [...filterParams.type].sort() : undefined,
    beds: filterParams.beds,
    furnished: filterParams.furnished ? true : undefined,
    moveInBy: filterParams.moveInBy,
    amenities: filterParams.amenities
      ? [...filterParams.amenities].sort()
      : undefined,
    gender: genderApplies ? viewerGender : undefined,
  };
  const filtered = applyFilters(
    await fetchListingsFiltered(JSON.stringify(key)),
    filterParams,
    viewerGender,
    idx,
  );
  return applySort(filtered, defaultSort(p), p.university, idx);
}

// Maps an `?area=` slug to its area UUID. Falls back to the slug itself when no
// area matches (yields an empty filter result, correct for an unknown area).
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
