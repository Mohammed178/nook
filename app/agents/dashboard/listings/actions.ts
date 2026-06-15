"use server";

import { revalidatePath } from "next/cache";
import {
  createListing,
  updateListing,
  softDeleteListing,
  restoreListing,
  addListingPhoto,
  removeListingPhoto,
  reorderListingPhotos,
  setListingCoords,
  publishListing,
  type ListingInput,
} from "@/lib/data/agent-listings";
import type { FurnishingLevel, Gender, ListingType } from "@/lib/types";
import { getDictionary } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

type Errors = Dictionary["errors"];

// Server actions for the agent dashboard. Each parses FormData into a typed
// ListingInput, then delegates to the RLS-enforced data layer
// (lib/data/agent-listings.ts). No service-role anywhere, the data layer runs
// every write through the agent's own session.

const LISTING_TYPES: ListingType[] = ["room", "studio", "apartment", "house"];
const FURNISHINGS: FurnishingLevel[] = ["unfurnished", "partial", "full"];
const GENDERS: Gender[] = ["male", "female", "mixed"];

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

// Optional positive-ish integer: empty → undefined, else parsed. Returns
// undefined for unparseable input (the DB CHECK is the real guard; this keeps
// the action total).
function optInt(fd: FormData, key: string): number | undefined {
  const raw = str(fd, key);
  if (raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function reqInt(fd: FormData, key: string): number | null {
  const raw = str(fd, key);
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function oneOf<T extends string>(value: string, allowed: T[]): T | undefined {
  return (allowed as string[]).includes(value) ? (value as T) : undefined;
}

export interface ListingActionResult {
  error?: string;
  // Field-level errors keyed by input name, surfaced inline by the form.
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  // Set on a successful create so the form can redirect to the edit page, where
  // the agent adds photos (4c-B1). The edit page is the listing-completion hub
  // the map-picker + publish button will join in B2.
  id?: string;
}

// Parses + validates the shared create/edit form. Required-vs-optional mirrors
// the DB NOT NULL set and the L-4b.11 CHECK constraints. lat/lng and photos are
// intentionally absent (LC-19 / L-4b.8).
function parseListingForm(
  fd: FormData,
  e: Errors,
): { input: ListingInput } | { fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};

  const title = str(fd, "title");
  if (!title) fieldErrors.title = e.addTitle;

  const type = oneOf(str(fd, "type"), LISTING_TYPES);
  if (!type) fieldErrors.type = e.chooseType;

  const furnishing = oneOf(str(fd, "furnishing"), FURNISHINGS);
  if (!furnishing) fieldErrors.furnishing = e.chooseFurnishing;

  const description = str(fd, "description");
  if (!description) fieldErrors.description = e.addDescription;

  const address = str(fd, "address");
  if (!address) fieldErrors.address = e.addAddress;

  const areaId = str(fd, "areaId");
  if (!areaId) fieldErrors.areaId = e.chooseArea;

  const city = str(fd, "city");
  if (!city) fieldErrors.city = e.addCity;

  const state = str(fd, "state");
  if (!state) fieldErrors.state = e.addState;

  const availableFrom = str(fd, "availableFrom");
  if (!availableFrom) fieldErrors.availableFrom = e.chooseAvailableFrom;

  const priceMonthly = reqInt(fd, "priceMonthly");
  if (priceMonthly == null || priceMonthly <= 0) {
    fieldErrors.priceMonthly = e.addPrice;
  }

  const bedrooms = reqInt(fd, "bedrooms");
  if (bedrooms == null || bedrooms < 0) fieldErrors.bedrooms = e.addBedrooms;

  const bathrooms = reqInt(fd, "bathrooms");
  if (bathrooms == null || bathrooms < 0) fieldErrors.bathrooms = e.addBathrooms;

  const amenities = fd
    .getAll("amenities")
    .map((v) => String(v))
    .filter(Boolean);

  // Optional numerics, only included when provided and non-negative.
  const deposit = optInt(fd, "deposit");
  if (deposit != null && deposit < 0) fieldErrors.deposit = e.depositNegative;
  const sizeSqft = optInt(fd, "sizeSqft");
  if (sizeSqft != null && sizeSqft <= 0) fieldErrors.sizeSqft = e.sizePositive;
  const minStayMonths = optInt(fd, "minStayMonths");
  if (minStayMonths != null && minStayMonths < 0) {
    fieldErrors.minStayMonths = e.minStayNegative;
  }

  const genderPreference = oneOf(str(fd, "genderPreference"), GENDERS);
  const utilitiesIncluded = fd.get("utilitiesIncluded") != null;

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  return {
    input: {
      title,
      type: type!,
      priceMonthly: priceMonthly!,
      deposit,
      utilitiesIncluded,
      bedrooms: bedrooms!,
      bathrooms: bathrooms!,
      sizeSqft,
      furnishing: furnishing!,
      genderPreference,
      availableFrom,
      minStayMonths,
      address,
      areaId,
      city,
      state,
      amenities,
      description,
    },
  };
}

export async function createListingAction(
  fd: FormData,
): Promise<ListingActionResult> {
  const e = (await getDictionary()).errors;
  const parsed = parseListingForm(fd, e);
  if ("fieldErrors" in parsed) return { fieldErrors: parsed.fieldErrors };

  const result = await createListing(parsed.input);
  if ("error" in result) return { error: result.error };

  revalidatePath("/agents/dashboard");
  return { ok: true, id: result.id };
}

export async function updateListingAction(
  id: string,
  fd: FormData,
): Promise<ListingActionResult> {
  const e = (await getDictionary()).errors;
  if (!id) return { error: e.missingListingId };
  const parsed = parseListingForm(fd, e);
  if ("fieldErrors" in parsed) return { fieldErrors: parsed.fieldErrors };

  const result = await updateListing(id, parsed.input);
  if (result.error) return { error: result.error };

  revalidatePath("/agents/dashboard");
  return { ok: true };
}

// Soft-delete / restore are plain form submits (no JS required). They return
// nothing on success; failure throws so the platform error boundary shows, the
// data layer already reports honest not-found/ownership errors, and these are
// owner-initiated on rows the owner just saw, so failure is genuinely
// exceptional.
export async function softDeleteListingAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  const result = await softDeleteListing(id);
  if (result.error) throw new Error(result.error);
  revalidatePath("/agents/dashboard");
}

export async function restoreListingAction(fd: FormData): Promise<void> {
  const id = String(fd.get("id") ?? "");
  if (!id) return;
  const result = await restoreListing(id);
  if (result.error) throw new Error(result.error);
  revalidatePath("/agents/dashboard");
}

// ---------- Photo management (4c-B1) ----------
// The bytes are uploaded client-side by the photo manager (browser client +
// agent session → storage RLS). These actions only record / mutate the
// listing_photos rows through the RLS-enforced data layer. No service-role.

export interface PhotoActionResult {
  ok?: boolean;
  error?: string;
}

export interface AddPhotoActionResult extends PhotoActionResult {
  // The new listing_photos id + sort_order, so the client can append the photo
  // optimistically without a round-trip for the id.
  id?: string;
}

// Records an already-uploaded object. alt_text is required (NOT NULL + the a11y
// contract), an empty alt is rejected here, not just in the UI.
export async function addListingPhotoAction(
  listingId: string,
  storagePath: string,
  altText: string,
): Promise<AddPhotoActionResult> {
  const dict = await getDictionary();
  if (!listingId || !storagePath) return { error: dict.errors.missingPhotoDetails };
  const alt = altText.trim();
  if (!alt) return { error: dict.photoManager.addAltText };

  const result = await addListingPhoto({ listingId, storagePath, altText: alt });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/agents/dashboard/listings/${listingId}/edit`);
  revalidatePath("/agents/dashboard");
  return { ok: true, id: result.id };
}

// Deletes a photo row. For a draft, removing the last photo is allowed; the
// last-photo trigger (NK002) only fires on an available listing, surfaced here
// as a clear message rather than a thrown error.
export async function removeListingPhotoAction(
  listingId: string,
  photoId: string,
): Promise<PhotoActionResult> {
  const e = (await getDictionary()).errors;
  if (!photoId) return { error: e.missingPhotoId };

  const result = await removeListingPhoto(photoId);
  if (!result.ok) {
    if (result.reason === "last_photo") {
      return { error: e.lastPhoto };
    }
    if (result.reason === "not_found") {
      return { error: e.photoNotFound };
    }
    return { error: e.couldNotRemovePhoto };
  }

  revalidatePath(`/agents/dashboard/listings/${listingId}/edit`);
  revalidatePath("/agents/dashboard");
  return { ok: true };
}

// ---------- Location + publish (4c-B2) ----------

// Persists the map-picker's chosen point. Owner-only via the data layer's RLS
// (no service-role). lat/lng only, never other columns.
export async function setListingCoordsAction(
  listingId: string,
  lat: number,
  lng: number,
): Promise<PhotoActionResult> {
  if (!listingId) return { error: (await getDictionary()).errors.missingListingId };

  const result = await setListingCoords(listingId, lat, lng);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/agents/dashboard/listings/${listingId}/edit`);
  revalidatePath("/agents/dashboard");
  return { ok: true };
}

// draft → available. The DB triggers/CHECK are the gate; map the typed reason to
// a message pointing the agent at the section to fix (Photos / Location).
export async function publishListingAction(
  listingId: string,
): Promise<PhotoActionResult> {
  const e = (await getDictionary()).errors;
  if (!listingId) return { error: e.missingListingId };

  const result = await publishListing(listingId);
  if (result.ok) {
    revalidatePath(`/agents/dashboard/listings/${listingId}/edit`);
    revalidatePath("/agents/dashboard");
    return { ok: true };
  }

  const messages: Record<string, string> = {
    needs_photos: e.needsPhotos,
    needs_coords: e.needsCoords,
    not_found: e.listingNotFoundOwn,
    error: e.couldNotPublish,
  };
  return { error: messages[result.reason] ?? messages.error };
}

export async function reorderListingPhotosAction(
  listingId: string,
  orderedPhotoIds: string[],
): Promise<PhotoActionResult> {
  if (!listingId || orderedPhotoIds.length === 0) {
    return { error: (await getDictionary()).errors.missingReorder };
  }

  const result = await reorderListingPhotos(listingId, orderedPhotoIds);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/agents/dashboard/listings/${listingId}/edit`);
  revalidatePath("/agents/dashboard");
  return { ok: true };
}
