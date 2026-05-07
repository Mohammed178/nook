import type { Listing, ListingType } from "@/lib/types";
import { LISTINGS } from "@/lib/seed/listings";
import { UNIVERSITY_BY_ID } from "@/lib/seed/universities";
import { AREA_BY_ID } from "@/lib/seed/areas";

export type SortKey = "priceAsc" | "priceDesc" | "distance" | "newest";

export interface ListingSearchParams {
  priceMin?: number;
  priceMax?: number;
  university?: string;
  area?: string;
  type?: ListingType[];
  beds?: number;
  furnished?: boolean;
  female?: boolean;
  amenities?: string[];
  moveInBy?: string;
  q?: string;
  sort?: SortKey;
  from?: string;
}

export interface RawSearchParams {
  [key: string]: string | string[] | undefined;
}

function num(v: string | string[] | undefined): number | undefined {
  if (Array.isArray(v)) v = v[0];
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function str(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) v = v[0];
  return v && v.trim() !== "" ? v : undefined;
}

function strList(v: string | string[] | undefined): string[] | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.filter(Boolean);
  return v.split(",").map((s) => s.trim()).filter(Boolean) || undefined;
}

const VALID_TYPES: ListingType[] = ["room", "studio", "apartment", "house"];

export function parseListingSearchParams(sp: RawSearchParams): ListingSearchParams {
  // Back-compat shim: minPrice/maxPrice → priceMin/priceMax; universityId → university; areaId → area
  const priceMin = num(sp.priceMin) ?? num(sp.minPrice);
  const priceMax = num(sp.priceMax) ?? num(sp.maxPrice);
  const university = str(sp.university) ?? str(sp.universityId);
  const area = str(sp.area) ?? str(sp.areaId);

  const typeRaw = strList(sp.type);
  const type = typeRaw?.filter((t): t is ListingType =>
    (VALID_TYPES as readonly string[]).includes(t),
  );

  const beds = num(sp.beds);
  const furnished = str(sp.furnished) === "1" || str(sp.furnished) === "true";
  const female = str(sp.female) === "1" || str(sp.female) === "true";
  const amenities = strList(sp.amenities);
  const moveInBy = str(sp.moveInBy);
  const q = str(sp.q);
  const from = str(sp.from);

  const sortRaw = str(sp.sort);
  const sort: SortKey | undefined =
    sortRaw === "priceAsc" ||
    sortRaw === "priceDesc" ||
    sortRaw === "distance" ||
    sortRaw === "newest"
      ? sortRaw
      : undefined;

  return {
    priceMin,
    priceMax,
    university,
    area,
    type: type && type.length > 0 ? type : undefined,
    beds,
    furnished: furnished || undefined,
    female: female || undefined,
    amenities,
    moveInBy,
    q,
    sort,
    from,
  };
}

export function defaultSort(p: ListingSearchParams): SortKey {
  if (p.sort) return p.sort;
  if (p.university || p.from === "university") return "distance";
  return "priceAsc";
}

export function serializeListingSearchParams(p: ListingSearchParams): string {
  const usp = new URLSearchParams();
  if (p.priceMin != null) usp.set("priceMin", String(p.priceMin));
  if (p.priceMax != null) usp.set("priceMax", String(p.priceMax));
  if (p.university) usp.set("university", p.university);
  if (p.area) usp.set("area", p.area);
  if (p.type && p.type.length > 0) usp.set("type", p.type.join(","));
  if (p.beds != null) usp.set("beds", String(p.beds));
  if (p.furnished) usp.set("furnished", "1");
  if (p.female) usp.set("female", "1");
  if (p.amenities && p.amenities.length > 0) usp.set("amenities", p.amenities.join(","));
  if (p.moveInBy) usp.set("moveInBy", p.moveInBy);
  if (p.q) usp.set("q", p.q);
  if (p.sort) usp.set("sort", p.sort);
  if (p.from) usp.set("from", p.from);
  return usp.toString();
}

export function buildListingsHref(p: ListingSearchParams): string {
  const qs = serializeListingSearchParams(p);
  return qs ? `/listings?${qs}` : "/listings";
}

/**
 * Build a query string suitable for appending to a listing-detail href.
 * Preserves the user's current search context as they navigate to a card.
 */
export function preserveQueryString(sp: RawSearchParams): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const item of v) usp.append(k, item);
    } else if (v !== "") {
      usp.set(k, v);
    }
  }
  return usp.toString();
}

// Haversine distance in km
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function listingDistanceKm(l: Listing, universityId?: string): number {
  const targetUniId =
    universityId && UNIVERSITY_BY_ID[universityId]
      ? universityId
      : l.nearbyUniversityIds[0];
  if (!targetUniId) return Number.POSITIVE_INFINITY;
  const uni = UNIVERSITY_BY_ID[targetUniId];
  if (!uni) return Number.POSITIVE_INFINITY;
  return distanceKm(l.lat, l.lng, uni.lat, uni.lng);
}

export function applyFilters(
  listings: Listing[],
  p: ListingSearchParams,
): Listing[] {
  return listings.filter((l) => {
    if (p.priceMin != null && l.priceMonthly < p.priceMin) return false;
    if (p.priceMax != null && l.priceMonthly > p.priceMax) return false;
    if (p.university && !l.nearbyUniversityIds.includes(p.university)) return false;
    if (p.area && l.areaId !== p.area) return false;
    if (p.type && p.type.length > 0 && !p.type.includes(l.type)) return false;
    if (p.beds != null && l.bedrooms < p.beds) return false;
    if (p.furnished && l.furnishing !== "full") return false;
    if (p.female && l.genderPreference !== "female") return false;
    if (p.amenities && p.amenities.length > 0) {
      for (const a of p.amenities) {
        if (!l.amenities.includes(a)) return false;
      }
    }
    if (p.moveInBy && l.availableFrom > p.moveInBy) return false;
    if (p.q) {
      const q = p.q.toLowerCase();
      const hay = [l.title, l.address, l.description].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function applySort(
  listings: Listing[],
  sort: SortKey,
  universityId?: string,
): Listing[] {
  const arr = [...listings];
  switch (sort) {
    case "priceAsc":
      arr.sort((a, b) => a.priceMonthly - b.priceMonthly);
      break;
    case "priceDesc":
      arr.sort((a, b) => b.priceMonthly - a.priceMonthly);
      break;
    case "distance":
      arr.sort(
        (a, b) =>
          listingDistanceKm(a, universityId) -
          listingDistanceKm(b, universityId),
      );
      break;
    case "newest":
      arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
  }
  return arr;
}

export function getFilteredListings(p: ListingSearchParams): Listing[] {
  const filtered = applyFilters(LISTINGS, p);
  return applySort(filtered, defaultSort(p), p.university);
}

export function getSimilarListings(
  current: Listing,
  limit = 4,
): Listing[] {
  const primaryUniId = current.nearbyUniversityIds[0];
  const candidates = LISTINGS.filter((l) => l.id !== current.id);

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

/** Resolve a search-params bundle into a human-readable area/uni breadcrumb. */
export function resolveLocationLabel(p: ListingSearchParams): {
  state?: string;
  area?: string;
  universityShort?: string;
} {
  if (p.area) {
    const a = AREA_BY_ID[p.area];
    if (a) return { state: a.state, area: a.name };
  }
  if (p.university) {
    const u = UNIVERSITY_BY_ID[p.university];
    if (u) return { state: u.state, universityShort: u.shortName };
  }
  return {};
}
