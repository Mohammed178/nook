import type { ListingSearchParams } from "@/lib/listings-search";
import type { Area } from "@/lib/types";
import { UNIVERSITY_BY_ID } from "@/lib/seed/universities";
import { formatPrice } from "@/lib/utils";

/**
 * Slug-keyed area lookup. Server resolves `getAllAreas()` once per request
 * and passes `Object.fromEntries(areas.map(a => [a.slug, a]))` to client
 * components (plain object so the prop is serializable across the
 * server→client boundary).
 *
 * Universities still flow through the seed lookup; they are migrated in a
 * later phase.
 */
export type AreaLookup = Record<string, Area>;

const TYPE_LABELS: Record<string, string> = {
  room: "Room",
  studio: "Studio",
  apartment: "Apartment",
  house: "House",
};

function priceChip(p: ListingSearchParams): string | null {
  const { priceMin, priceMax } = p;
  if (priceMin == null && priceMax == null) return null;
  if (priceMin != null && priceMax != null) {
    return `${formatPrice(priceMin)}–${formatPrice(priceMax)}`;
  }
  if (priceMax != null) return `Under ${formatPrice(priceMax)}`;
  return `From ${formatPrice(priceMin!)}`;
}

function priceForName(p: ListingSearchParams): string | null {
  const { priceMin, priceMax } = p;
  if (priceMin == null && priceMax == null) return null;
  if (priceMin != null && priceMax != null) {
    return `RM ${priceMin}–${priceMax}`;
  }
  if (priceMax != null) return `under RM ${priceMax}`;
  return `from RM ${priceMin}`;
}

function typeForName(p: ListingSearchParams): string {
  if (!p.type || p.type.length === 0) return "Rooms";
  if (p.type.length === 1) {
    const t = p.type[0];
    return t === "room" ? "Rooms" : t === "studio" ? "Studios" : t === "apartment" ? "Apartments" : "Houses";
  }
  return "Listings";
}

export function locationForName(
  p: ListingSearchParams,
  areas: AreaLookup,
): string | null {
  if (p.university) {
    const u = UNIVERSITY_BY_ID[p.university];
    if (u) return `near ${u.shortName}`;
  }
  if (p.area) {
    const a = areas[p.area];
    if (a) return `in ${a.name}`;
  }
  return null;
}

export function summarizeChips(
  p: ListingSearchParams,
  areas: AreaLookup,
): string[] {
  const chips: string[] = [];

  if (p.university) {
    const u = UNIVERSITY_BY_ID[p.university];
    if (u) chips.push(u.shortName);
  }
  if (p.area) {
    const a = areas[p.area];
    if (a) chips.push(a.name);
  }

  const price = priceChip(p);
  if (price) chips.push(price);

  if (p.beds != null) chips.push(`${p.beds}+ bed`);

  if (p.type && p.type.length > 0) {
    if (p.type.length === 1) chips.push(TYPE_LABELS[p.type[0]] ?? p.type[0]);
    else chips.push(`${p.type.length} types`);
  }

  if (p.furnished) chips.push("Furnished");

  if (p.amenities && p.amenities.length > 0) {
    chips.push(p.amenities.length === 1 ? "+1 amenity" : `+${p.amenities.length} amenities`);
  }

  if (p.q) chips.push(`Search: "${p.q}"`);

  if (p.moveInBy) chips.push(`Move-in by ${p.moveInBy}`);

  return chips;
}

export function suggestSearchName(
  p: ListingSearchParams,
  areas: AreaLookup,
): string {
  const noun = typeForName(p);
  const loc = locationForName(p, areas);
  const price = priceForName(p);
  const beds = p.beds != null ? `${p.beds}+ bed ` : "";

  const parts = [beds + noun];
  if (loc) parts.push(loc);
  if (price) parts.push(price);

  const out = parts.join(" ").replace(/\s+/g, " ").trim();
  return out.length > 0 ? out : "All listings";
}

export function summarizeSearch(
  p: ListingSearchParams,
  areas: AreaLookup,
): {
  chips: string[];
  suggestedName: string;
} {
  return {
    chips: summarizeChips(p, areas),
    suggestedName: suggestSearchName(p, areas),
  };
}
