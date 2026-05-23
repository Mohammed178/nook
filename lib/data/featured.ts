import "server-only";
import type { Agent, Listing } from "@/lib/types";
import { getAllListings } from "@/lib/data/listings";
import { FEATURED_AGENT_EXTRAS } from "@/lib/home-content";
import { getAllAgents } from "@/lib/data/agents";
import { getAllAreas } from "@/lib/data/areas";

const FEATURED_AGENT_RATING_MIN = 4.5;
const FEATURED_LISTINGS_LIMIT = 4;
const FEATURED_AGENTS_LIMIT = 3;

function byCreatedAtDesc(a: Listing, b: Listing) {
  return b.createdAt.localeCompare(a.createdAt);
}

export async function getFeaturedListings(): Promise<Listing[]> {
  const [agents, listings] = await Promise.all([getAllAgents(), getAllListings()]);
  // Post-3b-B-3: Listing.agentId is the agent UUID (FK to agents.id).
  const agentById = new Map(agents.map((a) => [a.id, a]));

  function agentRatingFor(agentId: string): number {
    return agentById.get(agentId)?.rating ?? 0;
  }

  const featured = listings
    .filter(
      (l) =>
        l.featured &&
        agentRatingFor(l.agentId) >= FEATURED_AGENT_RATING_MIN,
    )
    .sort(byCreatedAtDesc)
    .slice(0, FEATURED_LISTINGS_LIMIT);

  if (featured.length >= FEATURED_LISTINGS_LIMIT) return featured;

  const featuredIds = new Set(featured.map((l) => l.id));
  const padding = listings
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

// FEATURED_AGENT_EXTRAS is keyed by agent slug (URL-stable across schema
// changes). Display-only marketing data; falls back to derived values when an
// agent has no extra.
const EXTRAS_BY_AGENT_SLUG = Object.fromEntries(
  FEATURED_AGENT_EXTRAS.map((e) => [e.agentSlug, e]),
);

function deriveAreasServed(
  agentId: string,
  areaNameById: Map<string, string>,
  listings: Listing[],
): string {
  const names: string[] = [];
  for (const l of listings) {
    if (l.agentId !== agentId) continue;
    const name = areaNameById.get(l.areaId);
    if (name && !names.includes(name)) names.push(name);
    if (names.length === 3) break;
  }
  return names.join(" · ");
}

function countActiveListings(agentId: string, listings: Listing[]): number {
  return listings.filter(
    (l) => l.agentId === agentId && l.status === "available",
  ).length;
}

export async function getFeaturedAgents(): Promise<FeaturedAgent[]> {
  const [agents, areas, listings] = await Promise.all([
    getAllAgents(),
    getAllAreas(),
    getAllListings(),
  ]);
  const areaNameById = new Map(areas.map((a) => [a.id, a.name]));

  const top = [...agents]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, FEATURED_AGENTS_LIMIT);

  return top.map((agent) => {
    const extras = EXTRAS_BY_AGENT_SLUG[agent.slug];
    return {
      agent,
      activeListings:
        extras?.activeListings ?? countActiveListings(agent.id, listings),
      areasServed:
        extras?.areasServed ?? deriveAreasServed(agent.id, areaNameById, listings),
    };
  });
}
