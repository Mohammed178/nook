// Pure row→domain mappers. No "server-only" / no Supabase client / no
// next/headers — so rls-test-3ba.mjs (a plain Node script) can exercise the
// exact same mapping that the app helpers use. If you change the helpers'
// output shape, change it here and the test catches drift automatically.
import type { Agent, Area, Locale } from "@/lib/types";

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
