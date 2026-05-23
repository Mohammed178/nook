// Pure row→domain mappers. No "server-only" / no Supabase client / no
// next/headers — so rls-test-3ba.mjs (a plain Node script) can exercise the
// exact same mapping that the app helpers use. If you change the helpers'
// output shape, change it here and the test catches drift automatically.
import type {
  Agent,
  Area,
  FurnishingLevel,
  Gender,
  Listing,
  ListingStatus,
  ListingType,
  Locale,
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
  verified: boolean;
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
    verified: r.verified,
    yearsActive: r.years_active,
    bio: r.bio ?? undefined,
    bovaepLicence: r.bovaep_licence ?? undefined,
  };
}

export const AREA_COLS =
  "id, slug, name, city, state, lat, lng, nearby_university_ids, vibe";

export const AGENT_COLS =
  "id, slug, name, agency, rating, review_count, response_time_mins, languages, avatar_url, whatsapp, phone, email, verified, years_active, bio, bovaep_licence";

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
  lat: number;
  lng: number;
  nearby_university_ids: string[];
  walk_mins_to_campus: number | null;
  metres_to_campus: number | null;
  amenities: string[];
  photos: string[];
  description: string;
  agent_id: string;
  // numeric(2,1) arrives as a string from supabase-js — coerced below. Nullable
  // on listings (unlike agents, where rating/review_count are NOT NULL).
  rating: number | string | null;
  review_count: number | null;
  featured: boolean | null;
  listed_today: boolean | null;
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
    lat: r.lat,
    lng: r.lng,
    nearbyUniversityIds: r.nearby_university_ids,
    walkMinsToCampus: r.walk_mins_to_campus ?? undefined,
    metresToCampus: r.metres_to_campus ?? undefined,
    amenities: r.amenities,
    photos: r.photos,
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
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const LISTING_COLS =
  "id, slug, title, type, status, price_monthly, deposit, utilities_included, bedrooms, bathrooms, size_sqft, furnishing, gender_preference, available_from, min_stay_months, address, area_id, city, state, lat, lng, nearby_university_ids, walk_mins_to_campus, metres_to_campus, amenities, photos, description, agent_id, rating, review_count, featured, listed_today, created_at, updated_at";
