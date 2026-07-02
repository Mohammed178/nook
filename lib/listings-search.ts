import type { Gender, Listing, ListingType, University } from "@/lib/types";
import { UNIVERSITY_BY_ID } from "@/lib/seed/universities";
import { AREA_BY_ID } from "@/lib/seed/areas";
import {
  haversineKm,
  isNearCampus,
  nearestCampus,
  NEAR_CAMPUS_RADIUS_KM,
  SEED_UNI_INDEX,
  type UniIndex,
} from "@/lib/distance";

export type SortKey = "priceAsc" | "priceDesc" | "distance" | "newest";
export type GenderOverride = "off";
export type ListingsView = "list" | "map";

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
  /**
   * Presentation-only: which pane of the listings page is shown ("list" =
   * split list + inline map, "map" = map-only). Never read by applyFilters /
   * applySort, so it cannot perturb the in-memory search/filter path; it only
   * drives layout. Absent = "list".
   */
  view?: ListingsView;
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

// Non-negative integer-ish guard for URL-borne numerics (price, beds). Drops
// negatives and non-finite values so a tampered `?priceMin=-1` can't widen a
// query past intent. Upper-bounded to keep absurd values out of the UI.
const MAX_NUM = 1_000_000;
function nonNeg(n: number | undefined): number | undefined {
  if (n == null) return undefined;
  if (n < 0 || n > MAX_NUM) return undefined;
  return n;
}

// Free-text query is matched in-memory (applyFilters) and rendered only through
// React's auto-escaping, so it carries no injection risk; the cap is purely to
// bound work and URL length against a hostile `?q=<huge>`.
const MAX_Q_LEN = 80;

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
  const priceMin = nonNeg(num(sp.priceMin) ?? num(sp.minPrice));
  const priceMax = nonNeg(num(sp.priceMax) ?? num(sp.maxPrice));
  const university = str(sp.university) ?? str(sp.universityId);
  const area = str(sp.area) ?? str(sp.areaId);

  const typeRaw = strList(sp.type);
  const type = typeRaw?.filter((t): t is ListingType =>
    (VALID_TYPES as readonly string[]).includes(t),
  );

  const beds = nonNeg(num(sp.beds));
  const furnished = str(sp.furnished) === "1" || str(sp.furnished) === "true";
  const amenities = strList(sp.amenities);
  const moveInBy = str(sp.moveInBy);
  const q = str(sp.q)?.slice(0, MAX_Q_LEN);
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

  const view: ListingsView | undefined =
    str(sp.view) === "map" ? "map" : undefined;

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
    view,
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
  if (p.view === "map") usp.set("view", "map");
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
export function listingDistanceKm(
  l: Listing,
  universityId?: string,
  idx: UniIndex = SEED_UNI_INDEX,
): number {
  if (l.lat == null || l.lng == null) return Number.POSITIVE_INFINITY;
  const target =
    (universityId ? idx.byKey.get(universityId) : undefined) ??
    (() => {
      const n = nearestCampus(l.lat, l.lng, idx);
      return n ? idx.byKey.get(n.uniId) : undefined;
    })();
  if (!target) return Number.POSITIVE_INFINITY;
  return haversineKm(l.lat, l.lng, target.lat, target.lng);
}

export function applyFilters(
  listings: Listing[],
  p: ListingSearchParams,
  viewerGender?: Gender,
  idx: UniIndex = SEED_UNI_INDEX,
): Listing[] {
  const genderApplies =
    viewerGender !== undefined && p.genderOverride !== "off";
  return listings.filter((l) => {
    if (p.priceMin != null && l.priceMonthly < p.priceMin) return false;
    if (p.priceMax != null && l.priceMonthly > p.priceMax) return false;
    // Compute-don't-claim (4c-B2): "near university X" = within
    // NEAR_CAMPUS_RADIUS_KM of X's campus, computed from the listing's coords
    // (was: agent-tagged nearbyUniversityIds). A coordless listing matches no
    // campus filter, but still appears in unfiltered browse. `idx` carries the
    // live campus list so admin-added campuses filter correctly (0022).
    if (
      p.university &&
      !isNearCampus(l.lat, l.lng, p.university, NEAR_CAMPUS_RADIUS_KM, idx)
    ) {
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
  idx: UniIndex = SEED_UNI_INDEX,
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
          listingDistanceKm(a, universityId, idx) -
          listingDistanceKm(b, universityId, idx),
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

// Seed slug→University map (the seed legacy id is the slug), the default lookup
// for resolveLocationLabel when no live list is supplied.
const SEED_UNI_MAP: ReadonlyMap<string, University> = new Map(
  Object.entries(UNIVERSITY_BY_ID),
);

/**
 * Resolve a search-params bundle into a human-readable area/uni breadcrumb.
 * `uniByKey` defaults to the seed map; the listings page passes a slug→University
 * map built from the live DB list so admin-added campuses resolve a label too.
 */
export function resolveLocationLabel(
  p: ListingSearchParams,
  uniByKey: ReadonlyMap<string, University> = SEED_UNI_MAP,
): {
  state?: string;
  area?: string;
  universityShort?: string;
} {
  if (p.area) {
    const a = AREA_BY_ID[p.area];
    if (a) return { state: a.state, area: a.name };
  }
  if (p.university) {
    const u = uniByKey.get(p.university);
    if (u) return { state: u.state, universityShort: u.shortName };
  }
  return {};
}
