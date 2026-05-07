import type { Agent, Area, Listing, University } from "@/lib/types";
import { LISTINGS } from "@/lib/seed/listings";
import { AGENTS, AGENT_BY_ID } from "@/lib/seed/agents";
import { AREAS, AREA_BY_ID } from "@/lib/seed/areas";
import { UNIVERSITIES, UNIVERSITY_BY_ID } from "@/lib/seed/universities";
import {
  FEATURED_AGENT_EXTRAS,
  UNIVERSITY_RAIL,
  type UniversityRailItem,
} from "@/lib/home-content";

const FEATURED_AGENT_RATING_MIN = 4.5;
const FEATURED_LISTINGS_LIMIT = 4;
const FEATURED_AGENTS_LIMIT = 3;

function byCreatedAtDesc(a: Listing, b: Listing) {
  return b.createdAt.localeCompare(a.createdAt);
}

export function getFeaturedListings(): Listing[] {
  const featured = LISTINGS
    .filter((l) => l.featured && (AGENT_BY_ID[l.agentId]?.rating ?? 0) >= FEATURED_AGENT_RATING_MIN)
    .sort(byCreatedAtDesc)
    .slice(0, FEATURED_LISTINGS_LIMIT);

  if (featured.length >= FEATURED_LISTINGS_LIMIT) return featured;

  const featuredIds = new Set(featured.map((l) => l.id));
  const padding = LISTINGS
    .filter((l) => !featuredIds.has(l.id))
    .sort(byCreatedAtDesc)
    .slice(0, FEATURED_LISTINGS_LIMIT - featured.length);

  return [...featured, ...padding];
}

export function getListingBySlug(slug: string): Listing | undefined {
  return LISTINGS.find((l) => l.slug === slug);
}

export function getAgentById(id: string): Agent | undefined {
  return AGENT_BY_ID[id];
}

export function getAreaById(id: string): Area | undefined {
  return AREA_BY_ID[id];
}

export function getUniversityById(id: string): University | undefined {
  return UNIVERSITY_BY_ID[id];
}

export interface FeaturedAgent {
  agent: Agent;
  activeListings: number;
  areasServed: string;
}

const EXTRAS_BY_ID = Object.fromEntries(
  FEATURED_AGENT_EXTRAS.map((e) => [e.agentId, e]),
);

function deriveAreasServed(agentId: string): string {
  const names: string[] = [];
  for (const l of LISTINGS) {
    if (l.agentId !== agentId) continue;
    const name = AREA_BY_ID[l.areaId]?.name;
    if (name && !names.includes(name)) names.push(name);
    if (names.length === 3) break;
  }
  return names.join(" · ");
}

function countActiveListings(agentId: string): number {
  return LISTINGS.filter((l) => l.agentId === agentId && l.status === "available").length;
}

export function getFeaturedAgents(): FeaturedAgent[] {
  const top = [...AGENTS]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, FEATURED_AGENTS_LIMIT);

  return top.map((agent) => {
    const extras = EXTRAS_BY_ID[agent.id];
    return {
      agent,
      activeListings: extras?.activeListings ?? countActiveListings(agent.id),
      areasServed: extras?.areasServed ?? deriveAreasServed(agent.id),
    };
  });
}

export interface UniversityRailEntry extends UniversityRailItem {
  university: University;
}

export function getUniversityRail(): UniversityRailEntry[] {
  return UNIVERSITY_RAIL.flatMap((item) => {
    const university = UNIVERSITY_BY_ID[item.universityId];
    if (!university) return [];
    return [{ ...item, university }];
  });
}

// === Hero search parsers ===

export interface ParsedWhere {
  universityId?: string;
  areaId?: string;
  q?: string;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function parseWhere(input: string): ParsedWhere {
  const text = normalize(input);
  if (!text) return {};

  for (const u of UNIVERSITIES) {
    if (
      normalize(u.name) === text ||
      normalize(u.shortName) === text ||
      text.includes(normalize(u.shortName))
    ) {
      return { universityId: u.id };
    }
  }

  for (const a of AREAS) {
    if (normalize(a.name) === text || text.includes(normalize(a.name))) {
      return { areaId: a.id };
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
