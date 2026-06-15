import type { ListingSearchParams } from "@/lib/listings-search";
import type { Area } from "@/lib/types";
import { UNIVERSITY_BY_ID } from "@/lib/seed/universities";
import { formatPrice } from "@/lib/utils";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

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

type ListingsDict = Dictionary["listings"];
type SavedSearchesDict = Dictionary["savedSearches"];

function priceChip(p: ListingSearchParams, l: ListingsDict): string | null {
  const { priceMin, priceMax } = p;
  if (priceMin == null && priceMax == null) return null;
  if (priceMin != null && priceMax != null) {
    return format(l.priceRangeShort, {
      min: formatPrice(priceMin),
      max: formatPrice(priceMax),
    });
  }
  if (priceMax != null) return format(l.underPrice, { price: formatPrice(priceMax) });
  return format(l.fromPriceShort, { price: formatPrice(priceMin!) });
}

function priceForName(p: ListingSearchParams, s: SavedSearchesDict): string | null {
  const { priceMin, priceMax } = p;
  if (priceMin == null && priceMax == null) return null;
  if (priceMin != null && priceMax != null) {
    return format(s.nameRmRange, { min: priceMin, max: priceMax });
  }
  if (priceMax != null) return format(s.nameUnderRm, { max: priceMax });
  return format(s.nameFromRm, { min: priceMin! });
}

function typeForName(p: ListingSearchParams, s: SavedSearchesDict): string {
  if (!p.type || p.type.length === 0) return s.nameRooms;
  if (p.type.length === 1) {
    const t = p.type[0];
    return t === "room"
      ? s.nameRooms
      : t === "studio"
        ? s.nameStudios
        : t === "apartment"
          ? s.nameApartments
          : s.nameHouses;
  }
  return s.nameListings;
}

export function locationForName(
  p: ListingSearchParams,
  areas: AreaLookup,
  s: SavedSearchesDict,
): string | null {
  if (p.university) {
    const u = UNIVERSITY_BY_ID[p.university];
    if (u) return format(s.nameNearUni, { uni: u.shortName });
  }
  if (p.area) {
    const a = areas[p.area];
    if (a) return format(s.nameInArea, { area: a.name });
  }
  return null;
}

export function summarizeChips(
  p: ListingSearchParams,
  areas: AreaLookup,
  l: ListingsDict,
  s: SavedSearchesDict,
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

  const price = priceChip(p, l);
  if (price) chips.push(price);

  if (p.beds != null) chips.push(format(l.bedsPlus, { n: p.beds }));

  if (p.type && p.type.length > 0) {
    if (p.type.length === 1) {
      const slug = p.type[0];
      chips.push(l.types[slug as keyof typeof l.types] ?? slug);
    } else {
      chips.push(format(l.typesCount, { n: p.type.length }));
    }
  }

  if (p.furnished) chips.push(l.furnished);

  if (p.amenities && p.amenities.length > 0) {
    chips.push(
      p.amenities.length === 1
        ? s.oneAmenity
        : format(s.nAmenities, { n: p.amenities.length }),
    );
  }

  if (p.q) chips.push(format(s.searchPrefix, { q: p.q }));

  if (p.moveInBy) chips.push(format(s.moveInByChip, { date: p.moveInBy }));

  return chips;
}

export function suggestSearchName(
  p: ListingSearchParams,
  areas: AreaLookup,
  s: SavedSearchesDict,
): string {
  const noun = typeForName(p, s);
  const loc = locationForName(p, areas, s);
  const price = priceForName(p, s);
  const beds = p.beds != null ? `${format(s.nameBedsPlus, { n: p.beds })} ` : "";

  const parts = [beds + noun];
  if (loc) parts.push(loc);
  if (price) parts.push(price);

  const out = parts.join(" ").replace(/\s+/g, " ").trim();
  return out.length > 0 ? out : s.allListings;
}

export function summarizeSearch(
  p: ListingSearchParams,
  areas: AreaLookup,
  l: ListingsDict,
  s: SavedSearchesDict,
): {
  chips: string[];
  suggestedName: string;
} {
  return {
    chips: summarizeChips(p, areas, l, s),
    suggestedName: suggestSearchName(p, areas, s),
  };
}
