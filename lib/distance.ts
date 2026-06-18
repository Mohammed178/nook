// Phase 4c-B2, compute-don't-claim distance. Single source of all
// listing↔campus proximity math. Pure (no server-only / no Supabase / no
// next/headers) so server components, the browser map components, and the .mjs
// rls tests can all import it. Distance is computed at read from the listing's
// lat/lng + a campus index; there are no stored distance columns (0019 dropped
// them).
//
// Migration 0022: campuses are now DB-backed (admin can add more). Every
// proximity function takes an optional `idx` so a caller that has fetched the
// live DB list (getAllUniversities) can pass it; the default is the seed index
// built from lib/seed/universities.ts. Keeping the seed default means every
// existing caller — client map components, the .mjs rls tests, similar-listings
// — keeps working unchanged, and only the server data seam (getFilteredListings,
// the /universities pages) opts into the live list so admin-added campuses
// participate in proximity.
import { UNIVERSITIES } from "@/lib/seed/universities";
import type { University } from "@/lib/types";

// The single tunable "near a campus" threshold, straight-line km. Used by the
// /listings university filter, similar-listings, and the detail map's campus
// pins. B2 is one flat radius, no tiered bands.
export const NEAR_CAMPUS_RADIUS_KM = 5;

const EARTH_RADIUS_KM = 6371;

// A campus reduced to what proximity needs: its URL key + coordinates. `key` is
// the slug ("um") — the token the ?university= filter and hrefs carry — NOT the
// UUID primary key, so nearestCampus's result lines up with isNearCampus lookups
// and the seed (whose legacy id equals the slug).
export interface CampusLoc {
  key: string;
  lat: number;
  lng: number;
}

// A built index: the flat list (for nearest/within scans) plus a key→loc map
// (for the single-campus lookup). Build once per request and thread through.
export interface UniIndex {
  campuses: CampusLoc[];
  byKey: Map<string, CampusLoc>;
}

// Builds a UniIndex from any University-shaped list, keyed by `slug` when present
// (DB records) else `id` (the lean seed objects, whose id is the slug).
export function buildUniIndex(
  unis: ReadonlyArray<University & { slug?: string }>,
): UniIndex {
  const campuses: CampusLoc[] = unis.map((u) => ({
    key: u.slug ?? u.id,
    lat: u.lat,
    lng: u.lng,
  }));
  return { campuses, byKey: new Map(campuses.map((c) => [c.key, c])) };
}

// Seed-backed default index. Used by every caller that does not pass a live list.
export const SEED_UNI_INDEX: UniIndex = buildUniIndex(UNIVERSITIES);

// Great-circle distance between two WGS84 points, km. The one haversine in the
// codebase, listings-search.ts re-uses this rather than carrying its own.
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(x));
}

// The closest campus to a point, or null if the point has no coordinates
// (drafts are coordless until the map-picker sets them). Uncapped: a remote
// listing still reports its nearest campus honestly, however far. `uniId` is the
// campus key (slug).
export function nearestCampus(
  lat?: number | null,
  lng?: number | null,
  idx: UniIndex = SEED_UNI_INDEX,
): { uniId: string; km: number } | null {
  if (lat == null || lng == null) return null;
  let best: { uniId: string; km: number } | null = null;
  for (const c of idx.campuses) {
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (best === null || km < best.km) best = { uniId: c.key, km };
  }
  return best;
}

// Campus keys within `km` of the point (empty for a coordless point).
export function campusesWithinRadius(
  lat?: number | null,
  lng?: number | null,
  km: number = NEAR_CAMPUS_RADIUS_KM,
  idx: UniIndex = SEED_UNI_INDEX,
): string[] {
  if (lat == null || lng == null) return [];
  return idx.campuses
    .filter((c) => haversineKm(lat, lng, c.lat, c.lng) <= km)
    .map((c) => c.key);
}

// Is the point within `km` of a specific campus? Backs the /listings university
// filter, replaces the old "agent tagged this near X" claim with a computed
// "within 5 km of X". Coordless point or unknown campus key → false.
export function isNearCampus(
  lat: number | null | undefined,
  lng: number | null | undefined,
  uniKey: string | undefined,
  km: number = NEAR_CAMPUS_RADIUS_KM,
  idx: UniIndex = SEED_UNI_INDEX,
): boolean {
  if (lat == null || lng == null || !uniKey) return false;
  const c = idx.byKey.get(uniKey);
  if (!c) return false;
  return haversineKm(lat, lng, c.lat, c.lng) <= km;
}
