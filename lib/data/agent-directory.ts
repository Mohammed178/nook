import "server-only";
import type { Agent, Area, Listing, Review } from "@/lib/types";
import { getAllAgents, getAgentBySlug } from "@/lib/data/agents";
import { getAllListings } from "@/lib/data/listings";
import { getAllAreas } from "@/lib/data/areas";
import { REVIEWS_BY_AGENT } from "@/lib/seed/reviews";

// An agent plus the coverage we derive from their live listings: which areas
// they actually have rooms in, and (via those areas) which campuses they serve.
// Coverage drives the directory filters. University linkage comes from
// Area.nearbyUniversityIds (a real column) rather than Listing.nearbyUniversityIds
// (seed-only/vestigial post-0019), so it holds for DB-sourced rows.
export interface AgentWithCoverage {
  agent: Agent;
  activeListings: number;
  areaNames: string[];
  areaSlugs: string[];
  universityIds: string[];
}

function liveListingsByAgent(listings: Listing[]): Map<string, Listing[]> {
  const map = new Map<string, Listing[]>();
  for (const l of listings) {
    if (l.status !== "available") continue;
    const arr = map.get(l.agentId);
    if (arr) arr.push(l);
    else map.set(l.agentId, [l]);
  }
  return map;
}

function coverageFor(
  agent: Agent,
  agentListings: Listing[],
  areaById: Map<string, Area>,
): AgentWithCoverage {
  const areaSet = new Map<string, Area>();
  for (const l of agentListings) {
    const a = areaById.get(l.areaId);
    if (a) areaSet.set(a.id, a);
  }
  const coveredAreas = [...areaSet.values()];
  const uniSet = new Set<string>();
  for (const a of coveredAreas) {
    for (const u of a.nearbyUniversityIds) uniSet.add(u);
  }
  return {
    agent,
    activeListings: agentListings.length,
    areaNames: coveredAreas.map((a) => a.name),
    areaSlugs: coveredAreas.map((a) => a.slug),
    universityIds: [...uniSet],
  };
}

// Directory feed: every approved agent with derived coverage, plus the area list
// so the page can build filter facets. Sorted by rating like the homepage rail.
export async function getAgentsWithCoverage(): Promise<{
  agents: AgentWithCoverage[];
  areas: Area[];
}> {
  const [agents, areas, listings] = await Promise.all([
    getAllAgents(),
    getAllAreas(),
    getAllListings(),
  ]);
  const areaById = new Map(areas.map((a) => [a.id, a]));
  const byAgent = liveListingsByAgent(listings);

  const withCoverage = [...agents]
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .map((agent) => coverageFor(agent, byAgent.get(agent.id) ?? [], areaById));

  return { agents: withCoverage, areas };
}

export interface AgentProfile {
  agent: Agent;
  listings: Listing[];
  areaById: Map<string, Area>;
  reviews: Review[];
}

// Profile feed: the agent, their live listings (with an area lookup for cards),
// and every review for them. Reviews are seed-sourced today (keyed by slug);
// the read shape stays stable when they move to the DB.
export async function getAgentProfile(slug: string): Promise<AgentProfile | null> {
  const agent = await getAgentBySlug(slug);
  if (!agent) return null;

  const [areas, listings] = await Promise.all([getAllAreas(), getAllListings()]);
  const areaById = new Map(areas.map((a) => [a.id, a]));
  const agentListings = listings.filter(
    (l) => l.agentId === agent.id && l.status === "available",
  );

  return {
    agent,
    listings: agentListings,
    areaById,
    reviews: REVIEWS_BY_AGENT[slug] ?? [],
  };
}
