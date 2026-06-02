// Phase 4c-B2 — compute-don't-claim distance. Single source of all
// listing↔campus proximity math. Pure (no server-only / no Supabase / no
// next/headers) so server components, the browser map components, and the .mjs
// rls tests can all import it. Distance is computed at read from the listing's
// lat/lng + the UNIVERSITY_BY_ID constant — there are no stored distance
// columns (0019 dropped them). A DB-side proximity index is future work (LC-06).
import { UNIVERSITIES, UNIVERSITY_BY_ID } from "@/lib/seed/universities";

// The single tunable "near a campus" threshold, straight-line km. Used by the
// /listings university filter, similar-listings, and the detail map's campus
// pins. B2 is one flat radius — no tiered bands.
export const NEAR_CAMPUS_RADIUS_KM = 5;

const EARTH_RADIUS_KM = 6371;

// Great-circle distance between two WGS84 points, km. The one haversine in the
// codebase — listings-search.ts re-uses this rather than carrying its own.
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
// listing still reports its nearest campus honestly, however far.
export function nearestCampus(
  lat?: number | null,
  lng?: number | null,
): { uniId: string; km: number } | null {
  if (lat == null || lng == null) return null;
  let best: { uniId: string; km: number } | null = null;
  for (const u of UNIVERSITIES) {
    const km = haversineKm(lat, lng, u.lat, u.lng);
    if (best === null || km < best.km) best = { uniId: u.id, km };
  }
  return best;
}

// Campus ids within `km` of the point (empty for a coordless point).
export function campusesWithinRadius(
  lat?: number | null,
  lng?: number | null,
  km: number = NEAR_CAMPUS_RADIUS_KM,
): string[] {
  if (lat == null || lng == null) return [];
  return UNIVERSITIES.filter(
    (u) => haversineKm(lat, lng, u.lat, u.lng) <= km,
  ).map((u) => u.id);
}

// Is the point within `km` of a specific campus? Backs the /listings university
// filter — replaces the old "agent tagged this near X" claim with a computed
// "within 5 km of X". Coordless point or unknown uni → false.
export function isNearCampus(
  lat: number | null | undefined,
  lng: number | null | undefined,
  uniId: string | undefined,
  km: number = NEAR_CAMPUS_RADIUS_KM,
): boolean {
  if (lat == null || lng == null || !uniId) return false;
  const u = UNIVERSITY_BY_ID[uniId];
  if (!u) return false;
  return haversineKm(lat, lng, u.lat, u.lng) <= km;
}
