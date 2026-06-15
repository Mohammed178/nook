import "server-only";
import { randomUUID } from "node:crypto";
import { createActionClient, createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { getDictionary } from "@/lib/i18n/server";
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

// Phase 4b, agent-owned listing writes + dashboard read.
//
// Every function here is session-driven: it uses the anon-key client carrying
// the agent's auth cookies, so RLS (migration 0014) enforces ownership via
// current_agent_id(). NONE of these use the service-role client, that is
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
//     identically, this matches the established authenticated-read pattern
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
  // Distance claims (nearbyUniversityIds / walkMinsToCampus / metresToCampus)
  // removed in 4c-B2 (compute-don't-claim). Proximity is computed at read from
  // lat/lng; the agent no longer authors it. lat/lng are set by the map-picker
  // via setListingCoords, not through this input.
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
// of RLS, so a cross-agent draft-slug clash would only surface as a 23505 on
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
// - 4b drafts have no coordinates (nullable since 0014); the 4c map-picker sets
// them at publish (LC-19). photos live in listing_photos now (4c-B1) and are not
// a listings column; new drafts start photoless and add photos on the edit page.
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
  if (rpcErr) return { error: (await getDictionary()).errors.couldNotVerifyAgent };
  if (!agentId) return { error: (await getDictionary()).errors.onlyApprovedCreate };

  const now = new Date().toISOString();
  const cols = inputToColumns(input);

  const buildRow = (id: string, slug: string) => ({
    id,
    slug,
    status: "draft" as const,
    ...cols,
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

  if (error || !data) return { error: (await getDictionary()).errors.couldNotCreate };
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
  if (error) return { error: (await getDictionary()).errors.couldNotUpdate };
  if (!data || data.length === 0) {
    return { error: (await getDictionary()).errors.notYoursEdit };
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
  if (error) return { error: (await getDictionary()).errors.couldNotArchive };
  if (!data || data.length === 0) {
    return { error: (await getDictionary()).errors.notYoursArchive };
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
  if (error) return { error: (await getDictionary()).errors.couldNotRestore };
  if (!data || data.length === 0) {
    return { error: (await getDictionary()).errors.notYoursRestore };
  }
  return {};
}

export interface AgentListings {
  live: Listing[];
  archived: Listing[];
}

// The agent's own listings (all statuses, including drafts and soft-deleted),
// for the dashboard. Direct DB query with an explicit WHERE on agent_id (LC-06
// fetch-everything seam is NOT extended), the owner-read RLS policy also
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

// ============================================================
// Phase 4c-A, publish + photo writes (data layer only; UI is Phase B).
// All createActionClient + RLS-bound, zero service-role. The publish
// preconditions are DB-enforced (migration 0015): coords CHECK (23514), a
// photo-presence trigger (NK001), and a last-photo trigger (NK002). These
// functions catch those and return a typed result so Phase B's UI can branch.
// ============================================================

export type PublishResult =
  | { ok: true }
  | { ok: false; reason: "needs_photos" | "needs_coords" | "not_found" | "error" };

// draft -> available. The owner-update RLS policy scopes this to the caller's own
// rows; .eq("status","draft") makes it a pure draft->available transition (and a
// no-op 0-row match if the row is not the agent's draft). The DB enforces the
// preconditions, so we map the raised error to a typed reason rather than throw.
export async function publishListing(id: string): Promise<PublishResult> {
  const sb = await createActionClient();
  const { data, error } = await sb
    .from("listings")
    .update({ status: "available", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft")
    .select("id");

  if (error) {
    // The BEFORE trigger (NK001) fires before the coords CHECK (23514), so a
    // draft missing both reports needs_photos first; the agent fixes photos,
    // retries, then sees needs_coords.
    if (error.code === "NK001") return { ok: false, reason: "needs_photos" };
    if (error.code === "23514") return { ok: false, reason: "needs_coords" };
    return { ok: false, reason: "error" };
  }
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };
  return { ok: true };
}

export type SetCoordsResult =
  | { ok: true }
  | { ok: false; error: string };

// Sets lat/lng for an owned listing (4c-B2 map-picker). Deliberately NOT folded
// into updateListing: coordinates come from the picker, a sibling section, not
// the details form (which still excludes lat/lng, LC-19). This writes ONLY
// lat/lng, no other column, under the owner-update RLS policy (0014), so it
// needs no service-role and no new policy. Writing coords to a draft is fine;
// the available-needs-coords CHECK (0015) only bites at publish.
export async function setListingCoords(
  id: string,
  lat: number,
  lng: number,
): Promise<SetCoordsResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: (await getDictionary()).errors.coordsNumbers };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: (await getDictionary()).errors.coordsRange };
  }
  const sb = await createActionClient();
  const { data, error } = await sb
    .from("listings")
    .update({ lat, lng, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: (await getDictionary()).errors.couldNotSaveLocation };
  if (!data || data.length === 0) {
    return { ok: false, error: (await getDictionary()).errors.notYours };
  }
  return { ok: true };
}

export interface AddListingPhotoInput {
  listingId: string;
  storagePath: string;
  altText: string;
}

// Appends a photo to the listing. sort_order = max(existing) + 1; the owner-read
// RLS scopes the max() query to the caller's own photos. A rare concurrent
// double-add collides on the deferred unique (listing_id, sort_order) and
// surfaces as 23505 -> error (no silent corruption). Ownership is enforced by
// the listing_photos owner-insert with-check policy.
export async function addListingPhoto(
  input: AddListingPhotoInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const sb = await createActionClient();

  const { data: maxRow, error: maxErr } = await sb
    .from("listing_photos")
    .select("sort_order")
    .eq("listing_id", input.listingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) return { ok: false, error: (await getDictionary()).errors.couldNotReadPhotos };

  const nextSort = (maxRow?.sort_order ?? -1) + 1;

  const { data, error } = await sb
    .from("listing_photos")
    .insert({
      listing_id: input.listingId,
      storage_path: input.storagePath,
      alt_text: input.altText,
      sort_order: nextSort,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: (await getDictionary()).errors.couldNotAddPhoto };
  return { ok: true, id: data.id as string };
}

// Deletes a photo. The last-photo trigger (NK002) blocks removing the only photo
// of an available listing. A non-owned / missing id matches 0 rows (RLS), no error.
export async function removeListingPhoto(
  photoId: string,
): Promise<{ ok: true } | { ok: false; reason: "last_photo" | "not_found" | "error" }> {
  const sb = await createActionClient();
  const { data, error } = await sb
    .from("listing_photos")
    .delete()
    .eq("id", photoId)
    .select("id");
  if (error) {
    if (error.code === "NK002") return { ok: false, reason: "last_photo" };
    return { ok: false, reason: "error" };
  }
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };
  return { ok: true };
}

// Reassigns sort_order to match orderedPhotoIds (index = new sort_order). Reads
// the listing's photos (owner-read RLS), remaps, then writes them back in a
// SINGLE upsert statement keyed on the PK. Because the (listing_id, sort_order)
// unique is DEFERRABLE INITIALLY DEFERRED, the transient duplicate orders that
// occur mid-swap are tolerated until the statement's transaction commits. Full
// rows are sent so the upsert's INSERT branch (never taken here) would not trip
// NOT NULL. Ownership is enforced by the owner-read + owner-update policies.
export async function reorderListingPhotos(
  listingId: string,
  orderedPhotoIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = await createActionClient();

  const { data: photos, error: readErr } = await sb
    .from("listing_photos")
    .select("id, listing_id, storage_path, alt_text, sort_order, created_at")
    .eq("listing_id", listingId);
  if (readErr || !photos) return { ok: false, error: (await getDictionary()).errors.couldNotReadPhotos2 };

  const byId = new Map(photos.map((p) => [p.id as string, p]));
  if (
    orderedPhotoIds.length !== photos.length ||
    !orderedPhotoIds.every((id) => byId.has(id))
  ) {
    return { ok: false, error: (await getDictionary()).errors.reorderExact };
  }

  const rows = orderedPhotoIds.map((id, index) => ({
    ...byId.get(id)!,
    sort_order: index,
  }));

  const { error } = await sb
    .from("listing_photos")
    .upsert(rows, { onConflict: "id" });
  if (error) return { ok: false, error: (await getDictionary()).errors.couldNotReorderPhotos };
  return { ok: true };
}

export interface ListingPhoto {
  id: string;
  storagePath: string;
  altText: string;
  sortOrder: number;
}

// The listing's photos in display order, for the edit-page photo manager. Uses
// the read client (server component); owner-read RLS scopes it to the caller's
// own listing. A non-owned / missing id simply returns [].
export async function getListingPhotos(listingId: string): Promise<ListingPhoto[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("listing_photos")
    .select("id, storage_path, alt_text, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id as string,
    storagePath: p.storage_path as string,
    altText: p.alt_text as string,
    sortOrder: p.sort_order as number,
  }));
}
