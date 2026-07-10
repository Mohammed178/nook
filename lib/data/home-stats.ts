import "server-only";
import { getAllListings } from "@/lib/data/listings";
import { getAllAgents } from "@/lib/data/agents";
import { getAllUniversities } from "@/lib/data/universities";

export interface HomeCounts {
  roomsLive: number;
  verifiedAgents: number;
  campuses: number;
}

// Compute-don't-claim: every homepage number derives from the DB at render.
// Each source is already unstable_cache'd (listings/agents/universities tags),
// so this adds no extra round-trips beyond what the page fetches anyway.
export async function getHomeCounts(): Promise<HomeCounts> {
  const [listings, agents, universities] = await Promise.all([
    getAllListings(),
    getAllAgents(),
    getAllUniversities(),
  ]);
  return {
    roomsLive: listings.filter((l) => l.status === "available").length,
    verifiedAgents: agents.length,
    campuses: universities.length,
  };
}
