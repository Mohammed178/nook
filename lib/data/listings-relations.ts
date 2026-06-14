import "server-only";
import type { Agent, Area, Listing, ListingWithRelations } from "@/lib/types";
import { getAllAgents, getAgentByUuid } from "@/lib/data/agents";
import { getAllAreas, getAreaByUuid } from "@/lib/data/areas";

/**
 * Two-query-then-in-memory resolution for list pages. Fetches getAllAreas()
 * and getAllAgents() once each, then walks `listings` and resolves each
 * relation by UUID. No N+1.
 *
 * Post-3b-B-3: Listing.areaId / Listing.agentId carry the area/agent UUID
 * (FK to areas.id / agents.id, migration 0009). Resolution is a direct
 * id-keyed Map lookup, no legacy-id bridge.
 */
export async function attachListingRelations(
  listings: Listing[],
): Promise<ListingWithRelations[]> {
  const [agents, areas] = await Promise.all([getAllAgents(), getAllAreas()]);
  const agentById = new Map<string, Agent>(agents.map((a) => [a.id, a]));
  const areaById = new Map<string, Area>(areas.map((a) => [a.id, a]));

  return listings.map((listing) => ({
    listing,
    agent: agentById.get(listing.agentId) ?? null,
    area: areaById.get(listing.areaId) ?? null,
  }));
}

/** Single-listing resolution for detail pages. Two targeted queries by UUID. */
export async function attachSingleListingRelations(
  listing: Listing,
): Promise<ListingWithRelations> {
  const [agent, area] = await Promise.all([
    getAgentByUuid(listing.agentId),
    getAreaByUuid(listing.areaId),
  ]);
  return { listing, agent, area };
}
