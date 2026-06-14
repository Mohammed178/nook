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

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function endOfMonthISO(year: number, monthIdx: number): string {
  const last = new Date(Date.UTC(year, monthIdx + 1, 0));
  return `${last.getUTCFullYear()}-${pad2(last.getUTCMonth() + 1)}-${pad2(last.getUTCDate())}`;
}

export function parseMoveInBy(input: string, today = new Date()): string | undefined {
  const text = input.trim().toLowerCase();
  if (!text || text === "anytime") return undefined;

  const todayISO = today.toISOString().slice(0, 10);
  const clamp = (iso: string) => (iso < todayISO ? todayISO : iso);

  // Specific date "15 Aug 2026" or "Aug 15 2026"
  const dmy = text.match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const mIdx = MONTHS[m];
    if (mIdx != null) return clamp(`${y}-${pad2(mIdx + 1)}-${pad2(Number(d))}`);
  }
  const mdy = text.match(/([a-z]+)\s+(\d{1,2})\s*,?\s+(\d{4})/);
  if (mdy) {
    const [, m, d, y] = mdy;
    const mIdx = MONTHS[m];
    if (mIdx != null) return clamp(`${y}-${pad2(mIdx + 1)}-${pad2(Number(d))}`);
  }

  // Month + year "Aug 2026"
  const my = text.match(/([a-z]+)\s+(\d{4})/);
  if (my) {
    const [, m, y] = my;
    const mIdx = MONTHS[m];
    if (mIdx != null) return clamp(endOfMonthISO(Number(y), mIdx));
  }

  // ISO date passthrough
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return clamp(text);

  return undefined;
}
