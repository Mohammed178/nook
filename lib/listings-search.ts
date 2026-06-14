import type { Gender, Listing, ListingType } from "@/lib/types";
import { UNIVERSITY_BY_ID } from "@/lib/seed/universities";
import { AREA_BY_ID } from "@/lib/seed/areas";
import {
  haversineKm,
  isNearCampus,
  nearestCampus,
  NEAR_CAMPUS_RADIUS_KM,
} from "@/lib/distance";

export type SortKey = "priceAsc" | "priceDesc" | "distance" | "newest";
export type GenderOverride = "off";

export interface ListingSearchParams {
  priceMin?: number;
  priceMax?: number;
  university?: string;
  area?: string;
  type?: ListingType[];
  beds?: number;
  furnished?: boolean;
  amenities?: string[];
  moveInBy?: string;
  q?: string;
  sort?: SortKey;
  from?: string;
  /**
   * Per-session opt-out for the auto-applied gender filter (driven by
   * profile.gender_preference). Only "off" is meaningful. Absence = filter
   * applies when profile gender is set. Never represents a gender value
   * itself; gender is profile-only, never URL-borne.
   */
  genderOverride?: GenderOverride;
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

  const genderOverride: GenderOverride | undefined =
    str(sp.genderOverride) === "off" ? "off" : undefined;

  return {
    priceMin,
    priceMax,
    university,
    area,
    type: type && type.length > 0 ? type : undefined,
    beds,
    furnished: furnished || undefined,
    amenities,
    moveInBy,
    q,
    sort,
    from,
    genderOverride,
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
  if (p.amenities && p.amenities.length > 0) usp.set("amenities", p.amenities.join(","));
  if (p.moveInBy) usp.set("moveInBy", p.moveInBy);
  if (p.q) usp.set("q", p.q);
  if (p.sort) usp.set("sort", p.sort);
  if (p.from) usp.set("from", p.from);
  if (p.genderOverride === "off") usp.set("genderOverride", "off");
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

// Straight-line km from a listing to a campus. With an explicit universityId,
// measures to that campus; otherwise to the listing's nearest campus (4c-B2,
// the old l.nearbyUniversityIds[0] claim is gone, distance is computed from
// coordinates). lat/lng are nullable (drafts carry none); a coordinate-less
// listing sorts last. The haversine lives in lib/distance.ts (single source).
export function listingDistanceKm(l: Listing, universityId?: string): number {
  if (l.lat == null || l.lng == null) return Number.POSITIVE_INFINITY;
  const targetUniId =
    universityId && UNIVERSITY_BY_ID[universityId]
      ? universityId
      : nearestCampus(l.lat, l.lng)?.uniId;
  if (!targetUniId) return Number.POSITIVE_INFINITY;
  const uni = UNIVERSITY_BY_ID[targetUniId];
  if (!uni) return Number.POSITIVE_INFINITY;
  return haversineKm(l.lat, l.lng, uni.lat, uni.lng);
}

export function applyFilters(
  listings: Listing[],
  p: ListingSearchParams,
  viewerGender?: Gender,
): Listing[] {
  const genderApplies =
    viewerGender !== undefined && p.genderOverride !== "off";
  return listings.filter((l) => {
    if (p.priceMin != null && l.priceMonthly < p.priceMin) return false;
    if (p.priceMax != null && l.priceMonthly > p.priceMax) return false;
    // Compute-don't-claim (4c-B2): "near university X" = within
    // NEAR_CAMPUS_RADIUS_KM of X's campus, computed from the listing's coords
    // (was: agent-tagged nearbyUniversityIds). A coordless listing matches no
    // campus filter, but still appears in unfiltered browse.
    if (p.university && !isNearCampus(l.lat, l.lng, p.university, NEAR_CAMPUS_RADIUS_KM)) {
      return false;
    }
    if (p.area && l.areaId !== p.area) return false;
    if (p.type && p.type.length > 0 && !p.type.includes(l.type)) return false;
    if (p.beds != null && l.bedrooms < p.beds) return false;
    if (p.furnished && l.furnishing !== "full") return false;
    if (genderApplies && l.genderPreference !== viewerGender) return false;
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

// getFilteredListings / getSimilarListings relocated to lib/data/listings.ts
// in Phase 3b-B-1 (they bind to the DB data source; this module stays a pure
// array-operating core). applyFilters / applySort / defaultSort above are
// unchanged and consumed by the relocated wrappers.

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
