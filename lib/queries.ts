import type { Area, University } from "@/lib/types";
import { UNIVERSITY_BY_ID } from "@/lib/seed/universities";

// Featured-listings + featured-agents derivation lives in
// `lib/data/featured.ts` (server-only). Keeping it out of this module avoids
// pulling the areas/agents bridge, and through it the id-map JSON and the
// seed areas needed for `deriveAreasServed`, into any client bundle that
// imports `parseWhere` / `parseMoveInBy` from here.
//
// 3b-B-1: the seed-backed sync `getListingBySlug` moved to the DB-backed
// async helper in `lib/data/listings.ts` (server-only). It had no callers here
// (the detail page now imports it from lib/data/listings); kept this module
// client-safe by dropping the seed import entirely.

export function getUniversityById(id: string): University | undefined {
  return UNIVERSITY_BY_ID[id];
}

// The university rail derives its items directly in
// components/home/university-rail.tsx now (real campus photos + computed
// counts from lib/distance), the static UNIVERSITY_RAIL seed is gone.

// === Hero search parsers ===

export interface ParsedWhere {
  universityId?: string;
  areaId?: string;
  q?: string;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function parseWhere(
  input: string,
  areas: Area[],
  universities: University[],
): ParsedWhere {
  const text = normalize(input);
  if (!text) return {};

  for (const u of universities) {
    if (
      normalize(u.name) === text ||
      normalize(u.shortName) === text ||
      text.includes(normalize(u.shortName))
    ) {
      return { universityId: u.id };
    }
  }

  for (const a of areas) {
    if (normalize(a.name) === text || text.includes(normalize(a.name))) {
      // ParsedWhere.areaId feeds the URL `?area=` param, must be the slug.
      return { areaId: a.slug };
    }
  }

  return { q: input.trim() };
}

// Note: the former free-text `parseMoveInBy` (which guessed a date from strings
// like "Aug 2026") was retired when the hero/popover search moved to a native
// <input type="date"> that emits an ISO `YYYY-MM-DD` straight into `moveInBy`.
// No date guessing remains; the picker's own `min` guards past dates.
