export type ListingType = "room" | "studio" | "apartment" | "house";
export type ListingStatus = "draft" | "available" | "reserved" | "rented";
export type AgentStatus = "pending" | "approved" | "rejected";
export type FurnishingLevel = "unfurnished" | "partial" | "full";
export type Gender = "male" | "female" | "mixed";
export type Density = "compact" | "default" | "comfortable";
export type Locale = "en" | "ms" | "ar";
export type BrandTone = "olive" | "burnt" | "red";

export interface University {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  studentCount?: number;
  campusType?: "public" | "private";
}

export interface Area {
  /** Internal primary key. Post-3b-A: UUIDv5 derived from the legacy seed
   * id under a frozen namespace. Used for DB joins; 3b-B FK targets land here. */
  id: string;
  /** URL-stable identifier (e.g. "bangsar"). Used in hrefs and query params. */
  slug: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  nearbyUniversityIds: string[];
  vibe?: string;
}

export interface Agent {
  /** Internal primary key. Post-3b-A: UUIDv5 derived from the legacy seed
   * id under a frozen namespace. */
  id: string;
  /** URL-stable identifier (e.g. "aisha-rahman"). Used in hrefs. */
  slug: string;
  name: string;
  agency?: string;
  rating: number;
  reviewCount: number;
  responseTimeMins: number;
  languages: Locale[];
  avatarUrl: string;
  whatsapp: string;
  phone?: string;
  email?: string;
  status: AgentStatus;
  statusReason?: string;
  // Optional since Phase H2: the public `agents_public` view omits submitted_at,
  // so a public-sourced agent (rowToPublicAgent) does not carry it. The self/admin
  // paths (rowToAgent, full AGENT_COLS) still populate it. Chosen over a dedicated
  // PublicAgent type, which would retype 6+ files incl the shared
  // ListingWithRelations and listing-card — wider than this one flag warrants.
  submittedAt?: string;
  verifiedAt?: string;
  deletedAt?: string;
  yearsActive: number;
  bio?: string;
  bovaepLicence?: string;
}

export type NearbyPOIKind =
  | "uni"
  | "train"
  | "mall"
  | "mart"
  | "park"
  | "hospital"
  | "food";

export interface NearbyPOI {
  name: string;
  kind: NearbyPOIKind;
  distanceMetres: number;
}

export interface Review {
  id: string;
  listingId?: string;
  agentId?: string;
  reviewerName: string;
  reviewerAvatarUrl?: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ListingWithRelations {
  listing: Listing;
  agent: Agent | null;
  area: Area | null;
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  type: ListingType;
  status: ListingStatus;
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
  /** Area UUID (FK to areas.id) since 3b-B-3. Same primitive type, no longer a
   * legacy slug id. */
  areaId: string;
  city: string;
  state: string;
  /** Nullable since 4b (migration 0014): drafts are authored without
   * coordinates; the 4c map-picker populates lat/lng at publish (LC-19). Only
   * private drafts carry null — published listings always have coordinates. */
  lat?: number;
  lng?: number;
  /** Seed-only since 4c-B2 (compute-don't-claim). The DB columns
   * nearby_university_ids / walk_mins_to_campus / metres_to_campus were dropped
   * (migration 0019); proximity is computed at read from lat/lng + the
   * UNIVERSITY_BY_ID constant (lib/distance.ts). These fields survive only on
   * the seed objects (rls-test A2 parity) and are never emitted by rowToListing.
   * Vestigial — the A2-oracle rework LC removes the need for them. */
  nearbyUniversityIds?: string[];
  walkMinsToCampus?: number;
  metresToCampus?: number;
  amenities: string[];
  photos: string[];
  description: string;
  /** Agent UUID (FK to agents.id) since 3b-B-3. Same primitive type, no longer
   * the legacy agent string id. */
  agentId: string;
  rating?: number;
  reviewCount?: number;
  featured?: boolean;
  listedToday?: boolean;
  /** Soft-delete timestamp (migration 0014). Set → archived (hidden from public
   * reads by RLS, visible to the owning agent). null → live. Mirrors
   * Agent.deletedAt. */
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}
