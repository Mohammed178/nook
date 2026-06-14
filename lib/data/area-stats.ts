import type {
  Area,
  FurnishingLevel,
  Listing,
  ListingType,
  University,
} from "@/lib/types";
import { haversineKm } from "@/lib/distance";

// Pure analytics for the /areas pages. No Supabase, no server-only, given the
// already-fetched listings + areas it derives every number the page shows.
// Compute-don't-claim (4c-B2): counts, prices and campus distances are computed
// here at read; nothing is a stored or agent-entered tag.
//
// "Live" listing = published and not soft-deleted. The public Supabase read
// (getAllListings via the anon client) already hides drafts and deleted rows by
// RLS; the status/deletedAt filter here is defensive so the helper is correct
// for any listing array (incl. seed/test arrays that carry drafts).

function isLive(l: Listing): boolean {
  return l.status !== "draft" && !l.deletedAt;
}

export interface Tally<T extends string> {
  key: T;
  count: number;
}

export interface NearbyCampus {
  uniId: string;
  shortName: string;
  name: string;
  km: number;
}

export interface AreaStats {
  area: Area;
  liveCount: number;
  availableCount: number;
  fromPrice: number | null;
  medianPrice: number | null;
  maxPrice: number | null;
  typeMix: Tally<ListingType>[];
  furnishingMix: Tally<FurnishingLevel>[];
  /** Share (0–100) of live listings with utilities included; null when no data. */
  utilitiesIncludedPct: number | null;
  /** Gender-preference availability, "any" folding undefined/no-preference. */
  genderMix: Tally<string>[];
  topAmenities: Tally<string>[];
  nearbyCampuses: NearbyCampus[];
  bedroomsRange: [number, number] | null;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

// Descending-count tally over a key extractor, preserving first-seen order for
// equal counts (stable enough for a small seed; the page sorts by count).
function tally<T extends string>(
  items: Listing[],
  pick: (l: Listing) => T | undefined,
): Tally<T>[] {
  const counts = new Map<T, number>();
  for (const l of items) {
    const k = pick(l);
    if (k === undefined) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export function computeAreaStats(
  allListings: Listing[],
  area: Area,
  universities: University[],
): AreaStats {
  const live = allListings.filter((l) => l.areaId === area.id && isLive(l));

  const prices = live.map((l) => l.priceMonthly);
  const beds = live.map((l) => l.bedrooms);

  const amenityCounts = new Map<string, number>();
  for (const l of live) {
    for (const a of l.amenities) {
      amenityCounts.set(a, (amenityCounts.get(a) ?? 0) + 1);
    }
  }
  const topAmenities = [...amenityCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const utilWithData = live.filter((l) => l.utilitiesIncluded !== undefined);
  const utilitiesIncludedPct =
    utilWithData.length === 0
      ? null
      : Math.round(
          (utilWithData.filter((l) => l.utilitiesIncluded).length /
            utilWithData.length) *
            100,
        );

  // Nearest campuses by computed straight-line distance from the area centroid.
  // All campuses ranked, nearest three kept, honest "what's close" without a
  // curated tag (areas.nearbyUniversityIds stays the editorial association).
  const nearbyCampuses: NearbyCampus[] = universities
    .map((u) => ({
      uniId: u.id,
      shortName: u.shortName,
      name: u.name,
      km: haversineKm(area.lat, area.lng, u.lat, u.lng),
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 3);

  return {
    area,
    liveCount: live.length,
    availableCount: live.filter((l) => l.status === "available").length,
    fromPrice: prices.length ? Math.min(...prices) : null,
    medianPrice: median(prices),
    maxPrice: prices.length ? Math.max(...prices) : null,
    typeMix: tally(live, (l) => l.type),
    furnishingMix: tally(live, (l) => l.furnishing),
    utilitiesIncludedPct,
    genderMix: tally(live, (l) => l.genderPreference ?? "any"),
    topAmenities,
    nearbyCampuses,
    bedroomsRange: beds.length ? [Math.min(...beds), Math.max(...beds)] : null,
  };
}

// Index helper: stats for every area, sorted by live-room count desc (busiest
// neighbourhoods first), ties broken alphabetically.
export function computeAllAreaStats(
  allListings: Listing[],
  areas: Area[],
  universities: University[],
): AreaStats[] {
  return areas
    .map((a) => computeAreaStats(allListings, a, universities))
    .sort(
      (a, b) =>
        b.liveCount - a.liveCount || a.area.name.localeCompare(b.area.name),
    );
}

// --- Display labels (kept here so both pages render the same vocabulary) ---

export const TYPE_LABEL: Record<ListingType, string> = {
  room: "Room",
  studio: "Studio",
  apartment: "Apartment",
  house: "House",
};

export const FURNISHING_LABEL: Record<FurnishingLevel, string> = {
  unfurnished: "Unfurnished",
  partial: "Part-furnished",
  full: "Fully furnished",
};

export const GENDER_LABEL: Record<string, string> = {
  male: "Male only",
  female: "Female only",
  mixed: "Mixed",
  any: "No preference",
};

const AMENITY_LABEL: Record<string, string> = {
  wifi: "Wifi",
  aircon: "Air-conditioning",
  washer: "Washer",
  kitchen: "Kitchen",
  "shared-kitchen": "Shared kitchen",
  parking: "Parking",
  pool: "Pool",
  gym: "Gym",
  garden: "Garden",
  security: "Security",
  concierge: "Concierge",
};

export function amenityLabel(token: string): string {
  return (
    AMENITY_LABEL[token] ??
    token.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}
