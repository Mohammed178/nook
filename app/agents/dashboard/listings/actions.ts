"use server";

import { revalidatePath } from "next/cache";
import {
  createListing,
  updateListing,
  softDeleteListing,
  restoreListing,
  type ListingInput,
} from "@/lib/data/agent-listings";
import type { FurnishingLevel, Gender, ListingType } from "@/lib/types";

// Server actions for the agent dashboard. Each parses FormData into a typed
// ListingInput, then delegates to the RLS-enforced data layer
// (lib/data/agent-listings.ts). No service-role anywhere — the data layer runs
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
}

// Parses + validates the shared create/edit form. Required-vs-optional mirrors
// the DB NOT NULL set and the L-4b.11 CHECK constraints. lat/lng and photos are
// intentionally absent (LC-19 / L-4b.8).
function parseListingForm(
  fd: FormData,
): { input: ListingInput } | { fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};

  const title = str(fd, "title");
  if (!title) fieldErrors.title = "Add a title.";

  const type = oneOf(str(fd, "type"), LISTING_TYPES);
  if (!type) fieldErrors.type = "Choose a property type.";

  const furnishing = oneOf(str(fd, "furnishing"), FURNISHINGS);
  if (!furnishing) fieldErrors.furnishing = "Choose a furnishing level.";

  const description = str(fd, "description");
  if (!description) fieldErrors.description = "Add a description.";

  const address = str(fd, "address");
  if (!address) fieldErrors.address = "Add an address.";

  const areaId = str(fd, "areaId");
  if (!areaId) fieldErrors.areaId = "Choose an area.";

  const city = str(fd, "city");
  if (!city) fieldErrors.city = "Add a city.";

  const state = str(fd, "state");
  if (!state) fieldErrors.state = "Add a state.";

  const availableFrom = str(fd, "availableFrom");
  if (!availableFrom) fieldErrors.availableFrom = "Choose an available-from date.";

  const priceMonthly = reqInt(fd, "priceMonthly");
  if (priceMonthly == null || priceMonthly <= 0) {
    fieldErrors.priceMonthly = "Add a monthly price above zero.";
  }

  const bedrooms = reqInt(fd, "bedrooms");
  if (bedrooms == null || bedrooms < 0) fieldErrors.bedrooms = "Add the number of bedrooms.";

  const bathrooms = reqInt(fd, "bathrooms");
  if (bathrooms == null || bathrooms < 0) fieldErrors.bathrooms = "Add the number of bathrooms.";

  const nearbyUniversityIds = fd
    .getAll("nearbyUniversityIds")
    .map((v) => String(v))
    .filter(Boolean);
  if (nearbyUniversityIds.length === 0) {
    fieldErrors.nearbyUniversityIds = "Choose at least one nearby university.";
  }

  const amenities = fd
    .getAll("amenities")
    .map((v) => String(v))
    .filter(Boolean);

  // Optional numerics — only included when provided and non-negative.
  const deposit = optInt(fd, "deposit");
  if (deposit != null && deposit < 0) fieldErrors.deposit = "Deposit cannot be negative.";
  const sizeSqft = optInt(fd, "sizeSqft");
  if (sizeSqft != null && sizeSqft <= 0) fieldErrors.sizeSqft = "Size must be above zero.";
  const minStayMonths = optInt(fd, "minStayMonths");
  if (minStayMonths != null && minStayMonths < 0) {
    fieldErrors.minStayMonths = "Minimum stay cannot be negative.";
  }
  const walkMinsToCampus = optInt(fd, "walkMinsToCampus");
  const metresToCampus = optInt(fd, "metresToCampus");

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
      nearbyUniversityIds,
      walkMinsToCampus,
      metresToCampus,
      amenities,
      description,
    },
  };
}

export async function createListingAction(
  fd: FormData,
): Promise<ListingActionResult> {
  const parsed = parseListingForm(fd);
  if ("fieldErrors" in parsed) return { fieldErrors: parsed.fieldErrors };

  const result = await createListing(parsed.input);
  if ("error" in result) return { error: result.error };

  revalidatePath("/agents/dashboard");
  return { ok: true };
}

export async function updateListingAction(
  id: string,
  fd: FormData,
): Promise<ListingActionResult> {
  if (!id) return { error: "Missing listing id." };
  const parsed = parseListingForm(fd);
  if ("fieldErrors" in parsed) return { fieldErrors: parsed.fieldErrors };

  const result = await updateListing(id, parsed.input);
  if (result.error) return { error: result.error };

  revalidatePath("/agents/dashboard");
  return { ok: true };
}

// Soft-delete / restore are plain form submits (no JS required). They return
// nothing on success; failure throws so the platform error boundary shows — the
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
