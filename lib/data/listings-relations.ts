import "server-only";
import type { Agent, Area, Listing, ListingWithRelations } from "@/lib/types";
import {
  agentSlugForLegacyId,
  areaSlugForLegacyId,
} from "@/lib/data/legacy-id-bridge";
import { getAllAgents, getAgentBySlug } from "@/lib/data/agents";
import { getAllAreas, getAreaBySlug } from "@/lib/data/areas";

/**
 * Two-query-then-in-memory resolution for list pages. Fetches getAllAreas()
 * and getAllAgents() once each, then walks `listings` and resolves each
 * relation via the bridge → slug-keyed Map lookup. No N+1.
 *
 * 3b-A only: Listing.areaId / Listing.agentId still carry legacy seed string
 * ids. Bridge translates legacy → slug, then we look up by slug in the
 * Agent/Area objects (whose `.id` field carries the slug).
 */
export async function attachListingRelations(
  listings: Listing[],
): Promise<ListingWithRelations[]> {
  const [agents, areas] = await Promise.all([getAllAgents(), getAllAreas()]);
  const agentBySlug = new Map<string, Agent>(agents.map((a) => [a.slug, a]));
  const areaBySlug = new Map<string, Area>(areas.map((a) => [a.slug, a]));

  return listings.map((listing) => {
    const agentSlug = agentSlugForLegacyId(listing.agentId);
    const areaSlug = areaSlugForLegacyId(listing.areaId);
    return {
      listing,
      agent: agentSlug ? (agentBySlug.get(agentSlug) ?? null) : null,
      area: areaSlug ? (areaBySlug.get(areaSlug) ?? null) : null,
    };
  });
}

/** Single-listing resolution for detail pages. Two targeted queries. */
export async function attachSingleListingRelations(
  listing: Listing,
): Promise<ListingWithRelations> {
  const agentSlug = agentSlugForLegacyId(listing.agentId);
  const areaSlug = areaSlugForLegacyId(listing.areaId);
  const [agent, area] = await Promise.all([
    agentSlug ? getAgentBySlug(agentSlug) : Promise.resolve(null),
    areaSlug ? getAreaBySlug(areaSlug) : Promise.resolve(null),
  ]);
  return { listing, agent, area };
}
