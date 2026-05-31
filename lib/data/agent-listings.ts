import "server-only";
import { randomUUID } from "node:crypto";
import { createActionClient, createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import {
  LISTING_COLS,
  rowToListing,
  type ListingRow,
} from "@/lib/data/_row-mappers";
import type {
  FurnishingLevel,
  Gender,
  Listing,
  ListingType,
} from "@/lib/types";

// Phase 4b — agent-owned listing writes + dashboard read.
//
// Every function here is session-driven: it uses the anon-key client carrying
// the agent's auth cookies, so RLS (migration 0014) enforces ownership via
// current_agent_id(). NONE of these use the service-role client — that is
// forbidden outside the 4a-2 admin boundary. The RLS write policies are exactly
// what make service-role unnecessary here.
//
// Client choice:
//   - writes (create/update/softDelete/restore) use createActionClient because
//     they are invoked from server actions, where session-cookie refresh writes
//     are permitted.
//   - getAgentListings uses createClient (the read client) because it is called
//     from a server component, where cookie writes throw. The session still
//     rides the request cookies, so current_agent_id() resolves the agent
//     identically — this matches the established authenticated-read pattern
//     (getAgentByUserId, getCurrentUser). See the Phase A seal note.

export interface ListingInput {
  title: string;
  type: ListingType;
  priceMonthly: number;
  deposit?: number;
  utilitiesIncluded?: boolean;
  bedrooms: number;
  bathrooms: number;
  sizeSqft?: number;
  furnishing: FurnishingLevel;
  genderPreference?: Gender;
  availableFrom: string;
  minStayMonths?: number;
  address: string;
  areaId: string;
  city: string;
  state: string;
  nearbyUniversityIds: string[];
  walkMinsToCampus?: number;
  metresToCampus?: number;
  amenities: string[];
  description: string;
}

type ActionClient = Awaited<ReturnType<typeof createActionClient>>;

export type CreateListingResult =
  | { id: string; slug: string }
  | { error: string };

// Listing slug from the title (mirrors deriveUniqueSlug in the agent register
// action, LOCK-4.3). The RLS-visible pre-check catches collisions against the
// agent's own rows and any published listing. It CANNOT see another agent's
// draft (owner-read hides it), and listings.slug is globally UNIQUE regardless
// of RLS — so a cross-agent draft-slug clash would only surface as a 23505 on
// insert. createListing handles that case with a uuid-suffix fallback.
async function deriveListingSlug(title: string, sb: ActionClient): Promise<string> {
  let base = slugify(title);
  if (base.length < 3) base = `listing-${randomUUID().slice(0, 8)}`;
  let candidate = base;
  for (let n = 2; ; n++) {
    const { data } = await sb
      .from("listings")
      .select("slug")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${n}`;
  }
}

// Maps the editable input to listings columns. lat/lng are deliberately omitted
// — 4b drafts have no coordinates (nullable since 0014); the 4c map-picker sets
// them at publish (LC-19). photos default to [] (L-4b.8 — photos are 4c).
function inputToColumns(input: ListingInput) {
  return {
    title: input.title,
    type: input.type,
    price_monthly: input.priceMonthly,
    deposit: input.deposit ?? null,
    utilities_included: input.utilitiesIncluded ?? null,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    size_sqft: input.sizeSqft ?? null,
    furnishing: input.furnishing,
    gender_preference: input.genderPreference ?? null,
    available_from: input.availableFrom,
    min_stay_months: input.minStayMonths ?? null,
    address: input.address,
    area_id: input.areaId,
    city: input.city,
    state: input.state,
    nearby_university_ids: input.nearbyUniversityIds,
    walk_mins_to_campus: input.walkMinsToCampus ?? null,
    metres_to_campus: input.metresToCampus ?? null,
    amenities: input.amenities,
    description: input.description,
  };
}

export async function createListing(
  input: ListingInput,
): Promise<CreateListingResult> {
  const sb = await createActionClient();

  // Resolve the calling agent's id the same way the RLS policy does. Null →
  // not an approved agent → fail fast (the INSERT with-check would deny anyway).
  const { data: agentId, error: rpcErr } = await sb.rpc("current_agent_id");
  if (rpcErr) return { error: "Could not verify your agent account." };
  if (!agentId) return { error: "Only approved agents can create listings." };

  const now = new Date().toISOString();
  const cols = inputToColumns(input);

  const buildRow = (id: string, slug: string) => ({
    id,
    slug,
    status: "draft" as const,
    ...cols,
    photos: [] as string[],
    agent_id: agentId as string,
    created_at: now,
    updated_at: now,
  });

  let slug = await deriveListingSlug(input.title, sb);
  let { data, error } = await sb
    .from("listings")
    .insert(buildRow(randomUUID(), slug))
    .select("id, slug")
    .single();

  // Global slug UNIQUE clash that the RLS-visible pre-check could not see (a
  // collision against another agent's hidden draft). Fall back to a uuid suffix,
  // which is effectively collision-proof, and retry once.
  if (error?.code === "23505") {
    slug = `${slug}-${randomUUID().slice(0, 6)}`;
    ({ data, error } = await sb
      .from("listings")
      .insert(buildRow(randomUUID(), slug))
      .select("id, slug")
      .single());
  }

  if (error || !data) return { error: "Could not create the listing. Try again." };
  return { id: data.id as string, slug: data.slug as string };
}

export async function updateListing(
  id: string,
  input: ListingInput,
): Promise<{ error?: string }> {
  const sb = await createActionClient();
  // The owner-update RLS policy (using: agent_id = current_agent_id()) restricts
  // this to the agent's own rows; a non-owned id matches 0 rows with no error.
  // .select() lets us detect that and report honestly rather than silently
  // no-op. agent_id / status / slug / id / created_at / lat / lng / photos are
  // intentionally NOT updatable here.
  const { data, error } = await sb
    .from("listings")
    .update({ ...inputToColumns(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return { error: "Could not update the listing. Try again." };
  if (!data || data.length === 0) {
    return { error: "Listing not found, or it is not yours to edit." };
  }
  return {};
}

export async function softDeleteListing(id: string): Promise<{ error?: string }> {
  const sb = await createActionClient();
  const { data, error } = await sb
    .from("listings")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return { error: "Could not archive the listing. Try again." };
  if (!data || data.length === 0) {
    return { error: "Listing not found, or it is not yours to archive." };
  }
  return {};
}

export async function restoreListing(id: string): Promise<{ error?: string }> {
  const sb = await createActionClient();
  const { data, error } = await sb
    .from("listings")
    .update({ deleted_at: null })
    .eq("id", id)
    .select("id");
  if (error) return { error: "Could not restore the listing. Try again." };
  if (!data || data.length === 0) {
    return { error: "Listing not found, or it is not yours to restore." };
  }
  return {};
}

export interface AgentListings {
  live: Listing[];
  archived: Listing[];
}

// The agent's own listings (all statuses, including drafts and soft-deleted),
// for the dashboard. Direct DB query with an explicit WHERE on agent_id (LC-06
// fetch-everything seam is NOT extended) — the owner-read RLS policy also
// scopes this to the caller, so the .eq is belt-and-braces and supports the
// live/archive partition. One query, partitioned in code (OQ-1).
export async function getAgentListings(): Promise<AgentListings> {
  const sb = await createClient();
  const { data: agentId } = await sb.rpc("current_agent_id");
  if (!agentId) return { live: [], archived: [] };

  const { data, error } = await sb
    .from("listings")
    .select(LISTING_COLS)
    .eq("agent_id", agentId)
    .order("updated_at", { ascending: false });
  if (error || !data) return { live: [], archived: [] };

  const all = (data as ListingRow[]).map(rowToListing);
  return {
    live: all.filter((l) => l.deletedAt == null),
    archived: all.filter((l) => l.deletedAt != null),
  };
}

// Single own listing for the edit form. Owner-read RLS returns the row for any
// status (incl. draft / archived) as long as the caller owns it.
export async function getAgentListingById(id: string): Promise<Listing | null> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("listings")
    .select(LISTING_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToListing(data as ListingRow);
}
