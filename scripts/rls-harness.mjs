// Shared RLS-test harness helpers (Phase 4c-A). Extracted so rls-test-4b and
// rls-test-4c share the multi-step "plant an available listing" fixture, which
// post-0015 can no longer be a single INSERT (available requires coords + a
// listing_photos row + a draft->available flip).
//
// These helpers take the service-role `admin` client and the caller's own
// bookkeeping arrays as parameters rather than closing over module state, so
// each test file keeps its existing teardown ownership.

import { randomUUID } from "node:crypto";

// A minimal valid DRAFT listing row carrying coordinates. Satisfies every
// NOT NULL column and every 0014 CHECK. Draft status means the 0015 photo
// trigger and coords CHECK do not fire on this insert.
export function draftListingRowWithCoords({ id, agentId, areaUuid, now, slug }) {
  return {
    id,
    slug: slug ?? `eph-${id.slice(0, 8)}`,
    title: "Ephemeral Available Listing",
    type: "studio",
    status: "draft",
    price_monthly: 1000,
    deposit: 2000,
    utilities_included: false,
    bedrooms: 1,
    bathrooms: 1,
    size_sqft: 400,
    furnishing: "full",
    gender_preference: "mixed",
    available_from: "2026-06-01",
    min_stay_months: 6,
    address: "Test Address",
    area_id: areaUuid,
    city: "Kuala Lumpur",
    state: "WP Kuala Lumpur",
    amenities: ["wifi"],
    lat: 3.12,
    lng: 101.65,
    description: "Ephemeral available listing.",
    agent_id: agentId,
    created_at: now,
    updated_at: now,
  };
}

// Plants an `available` listing the only way 0015 permits: insert a draft WITH
// coords, insert one listing_photos row, then flip status to available. All
// service-role (bypasses RLS, but NOT the triggers/CHECK — which is exactly why
// the order matters). Pushes the listing id into createdListings for teardown;
// the photo cascade-deletes with the listing.
//
// Returns { listingId, photoId, storagePath }.
export async function plantAvailableListing({
  admin,
  areaUuid,
  agentId,
  createdListings,
  fail,
  now = new Date().toISOString(),
}) {
  const id = randomUUID();
  const draft = draftListingRowWithCoords({ id, agentId, areaUuid, now });
  const { error: e1 } = await admin.from("listings").insert(draft);
  if (e1) fail(`plantAvailableListing insert draft: ${e1.message}`);
  createdListings.push(id);

  const photoId = randomUUID();
  const storagePath = `${id}/${photoId}.jpg`;
  const { error: e2 } = await admin.from("listing_photos").insert({
    id: photoId,
    listing_id: id,
    storage_path: storagePath,
    alt_text: "Ephemeral photo",
    sort_order: 0,
  });
  if (e2) fail(`plantAvailableListing insert photo: ${e2.message}`);

  const { error: e3 } = await admin
    .from("listings")
    .update({ status: "available" })
    .eq("id", id);
  if (e3) fail(`plantAvailableListing publish: ${e3.message}`);

  return { listingId: id, photoId, storagePath };
}

// Teardown for listings that demotes available rows to draft BEFORE delete, so
// neither the last-photo trigger nor the cascade ever blocks teardown. Demoting
// available->draft does not fire the entry-only photo trigger. Service-role
// throughout. Call this for each created listing id; the listing_photos rows
// cascade-delete with the parent.
export async function demoteAndDeleteListing(admin, id) {
  try {
    await admin.from("listings").update({ status: "draft" }).eq("id", id);
  } catch {}
  try {
    await admin.from("listings").delete().eq("id", id);
  } catch {}
}
