import "server-only";
import type { Agent, Listing } from "@/lib/types";
import { LISTINGS } from "@/lib/seed/listings";
import { FEATURED_AGENT_EXTRAS } from "@/lib/home-content";
import { getAllAgents } from "@/lib/data/agents";
import { getAllAreas } from "@/lib/data/areas";
import {
  agentSlugForLegacyId,
  areaSlugForLegacyId,
} from "@/lib/data/legacy-id-bridge";
import idMap from "@/scripts/.id-map-3ba.json";

const FEATURED_AGENT_RATING_MIN = 4.5;
const FEATURED_LISTINGS_LIMIT = 4;
const FEATURED_AGENTS_LIMIT = 3;

function byCreatedAtDesc(a: Listing, b: Listing) {
  return b.createdAt.localeCompare(a.createdAt);
}

export async function getFeaturedListings(): Promise<Listing[]> {
  const agents = await getAllAgents();
  const agentBySlug = new Map(agents.map((a) => [a.slug, a]));

  function agentRatingFor(legacyAgentId: string): number {
    const slug = agentSlugForLegacyId(legacyAgentId);
    if (!slug) return 0;
    return agentBySlug.get(slug)?.rating ?? 0;
  }

  const featured = LISTINGS
    .filter(
      (l) =>
        l.featured &&
        agentRatingFor(l.agentId) >= FEATURED_AGENT_RATING_MIN,
    )
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

export interface FeaturedAgent {
  agent: Agent;
  activeListings: number;
  areasServed: string;
}

const EXTRAS_BY_LEGACY_ID = Object.fromEntries(
  FEATURED_AGENT_EXTRAS.map((e) => [e.agentId, e]),
);

interface IdMapEntry {
  uuid: string;
  slug: string;
}

const LEGACY_BY_AGENT_SLUG = new Map<string, string>();
for (const [legacyId, entry] of Object.entries(
  (idMap.agents ?? {}) as Record<string, IdMapEntry>,
)) {
  LEGACY_BY_AGENT_SLUG.set(entry.slug, legacyId);
}

function deriveAreasServed(
  legacyAgentId: string,
  areaNameBySlug: Map<string, string>,
): string {
  const names: string[] = [];
  for (const l of LISTINGS) {
    if (l.agentId !== legacyAgentId) continue;
    const areaSlug = areaSlugForLegacyId(l.areaId);
    if (!areaSlug) continue;
    const name = areaNameBySlug.get(areaSlug);
    if (name && !names.includes(name)) names.push(name);
    if (names.length === 3) break;
  }
  return names.join(" · ");
}

function countActiveListings(legacyAgentId: string): number {
  return LISTINGS.filter(
    (l) => l.agentId === legacyAgentId && l.status === "available",
  ).length;
}

export async function getFeaturedAgents(): Promise<FeaturedAgent[]> {
  const [agents, areas] = await Promise.all([getAllAgents(), getAllAreas()]);
  const areaNameBySlug = new Map(areas.map((a) => [a.slug, a.name]));

  const top = [...agents]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, FEATURED_AGENTS_LIMIT);

  return top.map((agent) => {
    const legacyAgentId = LEGACY_BY_AGENT_SLUG.get(agent.slug);
    const extras = legacyAgentId ? EXTRAS_BY_LEGACY_ID[legacyAgentId] : undefined;
    return {
      agent,
      activeListings:
        extras?.activeListings ??
        (legacyAgentId ? countActiveListings(legacyAgentId) : 0),
      areasServed:
        extras?.areasServed ??
        (legacyAgentId ? deriveAreasServed(legacyAgentId, areaNameBySlug) : ""),
    };
  });
}
