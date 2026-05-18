import { createClient } from "@/lib/supabase/server";
import {
  parseListingSearchParams,
  serializeListingSearchParams,
  getFilteredListings,
  type ListingSearchParams,
  type RawSearchParams,
} from "@/lib/listings-search";
import { summarizeChips } from "@/lib/saved-search-summary";
import { getAllAreas } from "@/lib/data/areas";

export interface SavedSearchRow {
  id: string;
  name: string;
  query: ListingSearchParams;
  canonicalQs: string;
  chips: string[];
  matchCount: number;
  createdAt: string;
}

/**
 * Normalize any object claiming to be ListingSearchParams through the
 * serializer + re-parser so the stored shape matches what `buildListingsHref`
 * consumes. Strips unknown keys and all identity-driven gender keys defensively:
 *   - `female` (legacy URL key, removed in Checkpoint H)
 *   - `gender` (never URL-borne, but stripped belt+braces)
 *   - `genderOverride` (UX state tied to the viewer's profile, not a filter)
 * Saved searches must never carry gender state across users or sessions.
 */
export function canonicalizeQuery(input: ListingSearchParams): {
  normalized: ListingSearchParams;
  canonicalQs: string;
} {
  const qs = serializeListingSearchParams(input);
  const raw = Object.fromEntries(new URLSearchParams(qs).entries()) as RawSearchParams;
  const reparsed = parseListingSearchParams(raw);
  delete (reparsed as { female?: unknown }).female;
  delete (reparsed as { gender?: unknown }).gender;
  delete reparsed.genderOverride;
  const canonicalQs = serializeListingSearchParams(reparsed);
  return { normalized: reparsed, canonicalQs };
}

export async function getSavedSearchesWithCounts(): Promise<SavedSearchRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, name, query_params, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const areas = await getAllAreas();
  // areaLookup is keyed by slug because saved-query `p.area` carries the URL
  // value (= area.slug). The DB uuid (area.id) is irrelevant here.
  const areaLookup = Object.fromEntries(areas.map((a) => [a.slug, a]));

  const out: SavedSearchRow[] = [];
  for (const row of data) {
    const query = (row.query_params ?? {}) as ListingSearchParams;
    const { canonicalQs } = canonicalizeQuery(query);
    const chips = summarizeChips(query, areaLookup);
    const matchCount = getFilteredListings(query).length;
    out.push({
      id: row.id as string,
      name: row.name as string,
      query,
      canonicalQs,
      chips,
      matchCount,
      createdAt: row.created_at as string,
    });
  }
  return out;
}
