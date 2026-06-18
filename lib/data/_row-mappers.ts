// Pure row→domain mappers. No "server-only" / no Supabase client / no
// next/headers, so rls-test-3ba.mjs (a plain Node script) can exercise the
// exact same mapping that the app helpers use. If you change the helpers'
// output shape, change it here and the test catches drift automatically.
import type {
  Agent,
  AgentStatus,
  Area,
  FurnishingLevel,
  Gender,
  Listing,
  ListingStatus,
  ListingType,
  Locale,
  UniversityRecord,
} from "@/lib/types";

export interface AreaRow {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  nearby_university_ids: string[];
  vibe: string | null;
}

// universities table (migration 0022). Editorial prose lives in the row (folded
// in from the retired lib/seed/university-content.ts source); the seed file is
// kept only as the migration source + the sync proximity fallback.
export interface UniversityRow {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  student_count: number | null;
  campus_type: "public" | "private" | null;
  description: string;
  transit: string[];
  campus_features: string[];
  website: string;
  photo_url: string;
  photo_file: string;
  deleted_at: string | null;
}

export function rowToUniversity(r: UniversityRow): UniversityRecord {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortName: r.short_name,
    city: r.city,
    state: r.state,
    lat: r.lat,
    lng: r.lng,
    studentCount: r.student_count ?? undefined,
    campusType: r.campus_type ?? undefined,
    description: r.description,
    transit: r.transit,
    campusFeatures: r.campus_features,
    website: r.website,
    photo: r.photo_url,
    photoFile: r.photo_file,
    deletedAt: r.deleted_at ?? undefined,
  };
}

export const UNIVERSITY_COLS =
  "id, slug, name, short_name, city, state, lat, lng, student_count, campus_type, description, transit, campus_features, website, photo_url, photo_file, deleted_at";

export interface AgentRow {
  id: string;
  slug: string;
  name: string;
  agency: string | null;
  rating: number | string;
  review_count: number;
  response_time_mins: number;
  languages: string[];
  avatar_url: string;
  whatsapp: string;
  phone: string | null;
  email: string | null;
  status: AgentStatus;
  status_reason: string | null;
  submitted_at: string;
  verified_at: string | null;
  deleted_at: string | null;
  years_active: number;
  bio: string | null;
  bovaep_licence: string | null;
}

export function rowToArea(r: AreaRow): Area {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    city: r.city,
    state: r.state,
    lat: r.lat,
    lng: r.lng,
    nearbyUniversityIds: r.nearby_university_ids,
    vibe: r.vibe ?? undefined,
  };
}

export function rowToAgent(r: AgentRow): Agent {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    agency: r.agency ?? undefined,
    rating: typeof r.rating === "string" ? Number(r.rating) : r.rating,
    reviewCount: r.review_count,
    responseTimeMins: r.response_time_mins,
    languages: r.languages as Locale[],
    avatarUrl: r.avatar_url,
    whatsapp: r.whatsapp,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    status: r.status,
    statusReason: r.status_reason ?? undefined,
    submittedAt: r.submitted_at,
    verifiedAt: r.verified_at ?? undefined,
    deletedAt: r.deleted_at ?? undefined,
    yearsActive: r.years_active,
    bio: r.bio ?? undefined,
    bovaepLicence: r.bovaep_licence ?? undefined,
  };
}

// Maps an `agents_public` view row to an Agent (Phase H2). status is hardcoded
// 'approved' (the view is approved-only); submittedAt / verifiedAt / deletedAt /
// statusReason are absent from the view and left undefined, Agent declares them
// optional precisely so a public-sourced agent need not carry them.
export function rowToPublicAgent(r: AgentPublicRow): Agent {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    agency: r.agency ?? undefined,
    rating: typeof r.rating === "string" ? Number(r.rating) : r.rating,
    reviewCount: r.review_count,
    responseTimeMins: r.response_time_mins,
    languages: r.languages as Locale[],
    avatarUrl: r.avatar_url,
    whatsapp: r.whatsapp,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    status: "approved",
    yearsActive: r.years_active,
    bio: r.bio ?? undefined,
    bovaepLicence: r.bovaep_licence ?? undefined,
  };
}

export const AREA_COLS =
  "id, slug, name, city, state, lat, lng, nearby_university_ids, vibe";

export const AGENT_COLS =
  "id, slug, name, agency, rating, review_count, response_time_mins, languages, avatar_url, whatsapp, phone, email, status, status_reason, submitted_at, verified_at, deleted_at, years_active, bio, bovaep_licence";

// Public read surface (Phase H2). The `agents_public` view (migration 0020) exposes
// only these safe columns for approved, non-deleted agents, no user_id, status,
// status_reason, submitted_at, verified_at, deleted_at, decided_by, or decided_at.
// `status` is not selected: the view is approved-only, so rowToPublicAgent hardcodes
// it. Keep this string in lockstep with the view's SELECT list (see 0020).
export const AGENT_PUBLIC_COLS =
  "id, slug, name, agency, rating, review_count, response_time_mins, languages, avatar_url, whatsapp, phone, email, years_active, bio, bovaep_licence";

// Row shape returned by the `agents_public` view, the safe-column subset of
// AgentRow, with no status/audit columns.
export interface AgentPublicRow {
  id: string;
  slug: string;
  name: string;
  agency: string | null;
  rating: number | string;
  review_count: number;
  response_time_mins: number;
  languages: string[];
  avatar_url: string;
  whatsapp: string;
  phone: string | null;
  email: string | null;
  years_active: number;
  bio: string | null;
  bovaep_licence: string | null;
}

// Embedded listing_photos row (Phase 4c-B1). Only the fields the public-URL
// resolution and ordering need; the table carries more (id, alt_text, etc.).
export interface ListingPhotoRow {
  storage_path: string;
  sort_order: number;
}

// Builds the public URL for a listing-photos storage object. Mirrors Supabase's
// public-object URL format, /storage/v1/object/public/{bucket}/{path}, so it
// needs no Supabase client (keeps this module pure and usable from .mjs tests).
// If supabase-js ever changes that format, update here. Paths are uuid-based
// ({listing_id}/{photo_uuid}.{ext}), so no URL-encoding is required.
const LISTING_PHOTOS_BUCKET = "listing-photos";
export function publicPhotoUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${LISTING_PHOTOS_BUCKET}/${storagePath}`;
}

export interface ListingRow {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  price_monthly: number;
  deposit: number | null;
  utilities_included: boolean | null;
  bedrooms: number;
  bathrooms: number;
  size_sqft: number | null;
  furnishing: string;
  gender_preference: string | null;
  available_from: string;
  min_stay_months: number | null;
  address: string;
  area_id: string;
  city: string;
  state: string;
  // Nullable since 4b (migration 0014 drops NOT NULL): drafts carry null until
  // the 4c map-picker sets coordinates at publish (LC-19).
  lat: number | null;
  lng: number | null;
  // Distance columns (nearby_university_ids / walk_mins_to_campus /
  // metres_to_campus) dropped in 4c-B2 (migration 0019); proximity is computed
  // app-side from lat/lng via lib/distance.ts. No longer selected or mapped.
  amenities: string[];
  // Photos now live in the listing_photos table (Phase 4c-B1) and arrive as a
  // PostgREST embed, not the retired listings.photos text[] column. rowToListing
  // sorts by sort_order and resolves each storage_path to a public URL, so the
  // domain Listing.photos shape (resolved-URL string[]) is unchanged.
  listing_photos: ListingPhotoRow[];
  description: string;
  agent_id: string;
  // numeric(2,1) arrives as a string from supabase-js, coerced below. Nullable
  // on listings (unlike agents, where rating/review_count are NOT NULL).
  rating: number | string | null;
  review_count: number | null;
  featured: boolean | null;
  listed_today: boolean | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToListing(r: ListingRow): Listing {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    type: r.type as ListingType,
    status: r.status as ListingStatus,
    priceMonthly: r.price_monthly,
    deposit: r.deposit ?? undefined,
    utilitiesIncluded: r.utilities_included ?? undefined,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    sizeSqft: r.size_sqft ?? undefined,
    furnishing: r.furnishing as FurnishingLevel,
    genderPreference: (r.gender_preference ?? undefined) as Gender | undefined,
    availableFrom: r.available_from,
    minStayMonths: r.min_stay_months ?? undefined,
    address: r.address,
    areaId: r.area_id,
    city: r.city,
    state: r.state,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    amenities: r.amenities,
    // Embed order is not guaranteed; sort by sort_order, then resolve to URLs.
    photos: [...r.listing_photos]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => publicPhotoUrl(p.storage_path)),
    description: r.description,
    agentId: r.agent_id,
    rating:
      r.rating == null
        ? undefined
        : typeof r.rating === "string"
          ? Number(r.rating)
          : r.rating,
    reviewCount: r.review_count ?? undefined,
    featured: r.featured ?? undefined,
    listedToday: r.listed_today ?? undefined,
    deletedAt: r.deleted_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const LISTING_COLS =
  "id, slug, title, type, status, price_monthly, deposit, utilities_included, bedrooms, bathrooms, size_sqft, furnishing, gender_preference, available_from, min_stay_months, address, area_id, city, state, lat, lng, amenities, description, agent_id, rating, review_count, featured, listed_today, deleted_at, created_at, updated_at, listing_photos(storage_path, sort_order)";
