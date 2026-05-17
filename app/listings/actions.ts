"use server";

import { revalidatePath } from "next/cache";
import { createActionClient } from "@/lib/supabase/server";
import { LISTING_BY_ID } from "@/lib/seed/listings";
import type { ListingSearchParams } from "@/lib/listings-search";
import { canonicalizeQuery } from "@/lib/saved-searches";

export type ToggleResult =
  | { saved: boolean; signedIn: true }
  | { error: string; signedIn?: boolean };

/**
 * Toggle favourite for the current user + listingId.
 * Idempotent: insert if missing, delete if present.
 * Validates listingId against seed (no FK in DB; seed = source of truth).
 */
export async function toggleFavouriteAction(
  listingId: string,
): Promise<ToggleResult> {
  if (!(listingId in LISTING_BY_ID)) {
    return { error: "Unknown listing." };
  }

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in.", signedIn: false };
  }

  const { data: existing } = await supabase
    .from("favourites")
    .select("id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("favourites")
      .delete()
      .eq("id", existing.id);
    if (error) return { error: error.message, signedIn: true };
    revalidatePath("/account/saved");
    return { saved: false, signedIn: true };
  }

  const { error } = await supabase
    .from("favourites")
    .insert({ user_id: user.id, listing_id: listingId });
  if (error) return { error: error.message, signedIn: true };
  revalidatePath("/account/saved");
  return { saved: true, signedIn: true };
}

/**
 * Record (or refresh) a listing view for the current user. Signed-out is a
 * silent no-op so callers can fire it unconditionally on mount.
 * Idempotent via unique(user_id, listing_id) + upsert: same listing re-viewed
 * just bumps viewed_at.
 */
export async function recordViewAction(listingId: string): Promise<void> {
  if (!(listingId in LISTING_BY_ID)) return;

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("recent_views").upsert(
    {
      user_id: user.id,
      listing_id: listingId,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,listing_id" },
  );
  if (error) return;

  revalidatePath("/account/recent");
}

export type AddSavedSearchResult =
  | { ok: true }
  | { duplicate: true; existingName: string }
  | { error: string };

/**
 * Insert a saved search for the current user. Canonicalizes the query through
 * the parse → serialize → re-parse round-trip so storage matches what
 * `buildListingsHref` consumes. Identity-driven gender keys are stripped by
 * `canonicalizeQuery` (see its docstring). Returns `{ duplicate }` when the
 * canonical form matches an existing row; caller can retry with
 * `force: true` to insert anyway.
 */
export async function addSavedSearchAction(input: {
  name: string;
  query: ListingSearchParams;
  force?: boolean;
}): Promise<AddSavedSearchResult> {
  const name = input.name.trim();
  if (name.length === 0) return { error: "Name is required." };
  if (name.length > 100) return { error: "Name is too long (max 100)." };

  const { normalized, canonicalQs } = canonicalizeQuery(input.query);

  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (!input.force) {
    const { data: existing } = await supabase
      .from("saved_searches")
      .select("name, query_params")
      .eq("user_id", user.id);
    if (existing) {
      for (const row of existing) {
        const otherQs = canonicalizeQuery(
          (row.query_params ?? {}) as ListingSearchParams,
        ).canonicalQs;
        if (otherQs === canonicalQs) {
          return { duplicate: true, existingName: row.name as string };
        }
      }
    }
  }

  const { error } = await supabase
    .from("saved_searches")
    .insert({ user_id: user.id, name, query_params: normalized });
  if (error) return { error: error.message };

  revalidatePath("/account/searches");
  return { ok: true };
}
