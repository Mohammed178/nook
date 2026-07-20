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
  // Campus siting (migration 0036). When true AND the caller is a university
  // lister, address/city/state/lat/lng are overwritten server-side from the
  // university record (the client's location inputs are ignored — never trust
  // client coordinates for the campus case). A non-university caller sending
  // true is rejected. Absent/false ⇒ the standard located-listing behaviour.
  onCampus?: boolean;
  // Distance claims (nearbyUniversityIds / walkMinsToCampus / metresToCampus)
  // removed in 4c-B2 (compute-don't-claim). Proximity is computed at read from
  // lat/lng; the agent no longer authors it. lat/lng are set by the map-picker
  // via setListingCoords, not through this input.
  amenities: string[];
  description: string;
}

type ActionClient = Awaited<ReturnType<typeof createActionClient>>;

// Resolves the server-authoritative campus location for an on-campus listing.
// Reads the caller's own agent row (agents_self_read, 0020) to confirm they are
// a university lister and to get their university_id, then reads that university
// record for the coordinates. Returns an error string for a non-university
// caller (the on_campus=true rejection) or an unresolvable university.
interface OnCampusFill {
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

async function resolveOnCampusFill(
  sb: ActionClient,
  agentId: string,
): Promise<{ ok: true; fill: OnCampusFill } | { ok: false; error: string }> {
  const { errors } = await getDictionary();
  const { data: agentRow } = await sb
    .from("agents")
    .select("lister_type, university_id")
    .eq("id", agentId)
    .maybeSingle();
  if (
    !agentRow ||
    agentRow.lister_type !== "university" ||
    !agentRow.university_id
  ) {
    return { ok: false, error: errors.onCampusUniversityOnly };
  }
  const { data: uni } = await sb
    .from("universities")
    .select("name, city, state, lat, lng")
    .eq("id", agentRow.university_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!uni) return { ok: false, error: errors.unknownUniversity };
  return {
    ok: true,
    fill: {
      address: uni.name as string,
      city: uni.city as string,
      state: uni.state as string,
      lat: uni.lat as number,
      lng: uni.lng as number,
    },
  };
}

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
    on_campus: input.onCampus ?? false,
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
  let cols = inputToColumns(input);
  // On-campus listings take their location from the university record, not the
  // client. This also fills lat/lng so the listing can publish without the map
  // picker (the campus pin is authoritative), and rejects on_campus=true from a
  // non-university caller.
  let coords: { lat: number; lng: number } | Record<string, never> = {};
  if (input.onCampus) {
    const r = await resolveOnCampusFill(sb, agentId as string);
    if (!r.ok) return { error: r.error };
    cols = {
      ...cols,
      address: r.fill.address,
      city: r.fill.city,
      state: r.fill.state,
    };
    coords = { lat: r.fill.lat, lng: r.fill.lng };
  }

  const buildRow = (id: string, slug: string) => ({
    id,
    slug,
    status: "draft" as const,
    ...cols,
    ...coords,
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
  // no-op. agent_id / status / slug / id / created_at / photos are intentionally
  // NOT updatable here. lat/lng are normally the map-picker's (setListingCoords)
  // — but an on-campus listing overwrites address/city/state AND lat/lng from the
  // university record (the campus pin is authoritative, LC parity with create).
  let updateCols: Record<string, unknown> = {
    ...inputToColumns(input),
    updated_at: new Date().toISOString(),
  };
  if (input.onCampus) {
    const { data: agentId } = await sb.rpc("current_agent_id");
    if (!agentId) return { error: (await getDictionary()).errors.onlyApprovedCreate };
    const r = await resolveOnCampusFill(sb, agentId as string);
    if (!r.ok) return { error: r.error };
    updateCols = {
      ...updateCols,
      address: r.fill.address,
      city: r.fill.city,
      state: r.fill.state,
      lat: r.fill.lat,
      lng: r.fill.lng,
    };
  }
  const { data, error } = await sb
    .from("listings")
    .update(updateCols)
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

export interface AddListingPhotosItem {
  storagePath: string;
  altText: string;
}

export interface AddedListingPhoto {
  id: string;
  storagePath: string;
  sortOrder: number;
}

// Batch sibling of addListingPhoto: records several already-uploaded objects in a
// SINGLE multi-row INSERT (one round-trip, one RLS check, one revalidate upstream)
// instead of N sequential add calls. sort_order is assigned max(existing)+1..+N in
// the given order. The caller is expected to cap N (the manager caps a batch at 4
// and the whole listing at MAX_PHOTOS). A concurrent batch on the SAME listing
// collides on the deferred unique (listing_id, sort_order) -> 23505 -> error (no
// silent corruption). Ownership is enforced by the owner-insert with-check policy.
// Returns the inserted rows mapped back by storage_path so the client can append
// them with their real ids + sort order.
export async function addListingPhotos(
  listingId: string,
  items: AddListingPhotosItem[],
): Promise<{ ok: true; photos: AddedListingPhoto[] } | { ok: false; error: string }> {
  if (items.length === 0) return { ok: true, photos: [] };
  const sb = await createActionClient();

  const { data: maxRow, error: maxErr } = await sb
    .from("listing_photos")
    .select("sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) return { ok: false, error: (await getDictionary()).errors.couldNotReadPhotos };

  const base = (maxRow?.sort_order ?? -1) + 1;
  const rows = items.map((it, i) => ({
    listing_id: listingId,
    storage_path: it.storagePath,
    alt_text: it.altText,
    sort_order: base + i,
  }));

  const { data, error } = await sb
    .from("listing_photos")
    .insert(rows)
    .select("id, storage_path, sort_order");
  if (error || !data) return { ok: false, error: (await getDictionary()).errors.couldNotAddPhoto };

  const byPath = new Map(
    data.map((r) => [r.storage_path as string, r]),
  );
  const photos = items.map((it) => {
    const r = byPath.get(it.storagePath)!;
    return {
      id: r.id as string,
      storagePath: it.storagePath,
      sortOrder: r.sort_order as number,
    };
  });
  return { ok: true, photos };
}

// Deletes a photo. The last-photo trigger (NK002) blocks removing the only photo
// of an available listing. A non-owned / missing id matches 0 rows (RLS), no error.
// The storage object is removed AFTER the row: if the row delete fails nothing is
// touched, and a failed object removal only strands an unreferenced file (logged),
// never a photo row pointing at a missing object.
export async function removeListingPhoto(
  photoId: string,
): Promise<{ ok: true } | { ok: false; reason: "last_photo" | "not_found" | "error" }> {
  const sb = await createActionClient();
  const { data, error } = await sb
    .from("listing_photos")
    .delete()
    .eq("id", photoId)
    .select("id, storage_path");
  if (error) {
    if (error.code === "NK002") return { ok: false, reason: "last_photo" };
    return { ok: false, reason: "error" };
  }
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };

  const path = data[0].storage_path as string;
  const { error: storageErr } = await sb.storage.from("listing-photos").remove([path]);
  if (storageErr) {
    console.error(
      `[listing-photos] row deleted but object removal failed path=${path}: ${storageErr.message}`,
    );
  }
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

// ---------- Videos (4d) ----------
// Sibling of the photo functions. Videos are optional and capped at 2 per
// listing; the cap is enforced in the DB (NK003 trigger), surfaced here as a
// typed reason. No last-video trigger (videos are not a publish precondition).

export interface AddListingVideosItem {
  storagePath: string;
  title: string;
}

export interface AddedListingVideo {
  id: string;
  storagePath: string;
  sortOrder: number;
}

// Records up to 2 already-uploaded objects in one multi-row insert. The DB cap
// trigger rejects the row(s) that would exceed 2 with errcode NK003, surfaced as
// reason 'cap'. Ownership is enforced by the owner-insert with-check policy.
export async function addListingVideos(
  listingId: string,
  items: AddListingVideosItem[],
): Promise<
  | { ok: true; videos: AddedListingVideo[] }
  | { ok: false; reason: "cap" | "error" }
> {
  if (items.length === 0) return { ok: true, videos: [] };
  const sb = await createActionClient();

  const { data: maxRow, error: maxErr } = await sb
    .from("listing_videos")
    .select("sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) return { ok: false, reason: "error" };

  const base = (maxRow?.sort_order ?? -1) + 1;
  const rows = items.map((it, i) => ({
    listing_id: listingId,
    storage_path: it.storagePath,
    title: it.title,
    sort_order: base + i,
  }));

  const { data, error } = await sb
    .from("listing_videos")
    .insert(rows)
    .select("id, storage_path, sort_order");
  if (error || !data) {
    if (error?.code === "NK003") return { ok: false, reason: "cap" };
    return { ok: false, reason: "error" };
  }

  const byPath = new Map(data.map((r) => [r.storage_path as string, r]));
  const videos = items.map((it) => {
    const r = byPath.get(it.storagePath)!;
    return {
      id: r.id as string,
      storagePath: it.storagePath,
      sortOrder: r.sort_order as number,
    };
  });
  return { ok: true, videos };
}

// Deletes a video. A non-owned / missing id matches 0 rows (RLS), reported as
// not_found. No last-video guard, videos are optional. Storage object removed
// after the row, same ordering rationale as removeListingPhoto.
export async function removeListingVideo(
  videoId: string,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "error" }> {
  const sb = await createActionClient();
  const { data, error } = await sb
    .from("listing_videos")
    .delete()
    .eq("id", videoId)
    .select("id, storage_path");
  if (error) return { ok: false, reason: "error" };
  if (!data || data.length === 0) return { ok: false, reason: "not_found" };

  const path = data[0].storage_path as string;
  const { error: storageErr } = await sb.storage.from("listing-videos").remove([path]);
  if (storageErr) {
    console.error(
      `[listing-videos] row deleted but object removal failed path=${path}: ${storageErr.message}`,
    );
  }
  return { ok: true };
}

export interface ListingVideo {
  id: string;
  storagePath: string;
  title: string;
  sortOrder: number;
}

// The listing's videos in display order, for the edit-page video manager. Owner-
// read RLS scopes it to the caller's own listing.
export async function getListingVideos(listingId: string): Promise<ListingVideo[]> {
  const sb = await createClient();
  const { data, error } = await sb
    .from("listing_videos")
    .select("id, storage_path, title, sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((v) => ({
    id: v.id as string,
    storagePath: v.storage_path as string,
    title: v.title as string,
    sortOrder: v.sort_order as number,
  }));
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
