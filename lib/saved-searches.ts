import { createClient } from "@/lib/supabase/server";
import {
  parseListingSearchParams,
  serializeListingSearchParams,
  type ListingSearchParams,
  type RawSearchParams,
} from "@/lib/listings-search";
import { getFilteredListings } from "@/lib/data/listings";
import { summarizeChips } from "@/lib/saved-search-summary";
import { getAllAreas } from "@/lib/data/areas";
import { getDictionary } from "@/lib/i18n/server";

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

  const [areas, dict] = await Promise.all([getAllAreas(), getDictionary()]);
  // areaLookup is keyed by slug because saved-query `p.area` carries the URL
  // value (= area.slug). The DB uuid (area.id) is irrelevant here.
  const areaLookup = Object.fromEntries(areas.map((a) => [a.slug, a]));

  const out: SavedSearchRow[] = [];
  for (const row of data) {
    const raw = (row.query_params ?? {}) as ListingSearchParams;
    // F-S1: stored query_params is untrusted jsonb (RLS pins user_id but not the
    // column shape, so a raw self-write can store any object). Canonicalize on
    // read through the same round-trip the write path uses, then derive chips /
    // matchCount / the client-returned query from the CANONICAL form, never the
    // raw stored value (only canonicalQs was normalized before). A malformed
    // shape (e.g. a non-array `type` that throws in serializeListingSearchParams)
    // must not crash the whole /account/searches render: degrade that one row to
    // an empty no-filter search. The row stays visible, renamable, and deletable.
    let query: ListingSearchParams = {};
    let canonicalQs = "";
    let chips: string[] = [];
    let matchCount = 0;
    try {
      const canonical = canonicalizeQuery(raw);
      query = canonical.normalized;
      canonicalQs = canonical.canonicalQs;
      chips = summarizeChips(query, areaLookup, dict.listings, dict.savedSearches);
      matchCount = (await getFilteredListings(query)).length;
    } catch {
      query = {};
      canonicalQs = "";
      chips = [];
      matchCount = 0;
    }
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
