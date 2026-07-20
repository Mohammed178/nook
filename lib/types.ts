export type ListingType = "room" | "studio" | "apartment" | "house";
export type ListingStatus = "draft" | "available" | "reserved" | "rented";
export type AgentStatus = "pending" | "approved" | "rejected";
export type AgentLicenceType = "REN" | "REA" | "PEA";
/** A lister on the `agents` rail (migration 0036). `undefined` on an Agent ⇒
 * a plain agent (seed fixtures don't retype); "university" is the campus-lister. */
export type ListerType = "agent" | "university";
export type FurnishingLevel = "unfurnished" | "partial" | "full";
export type Gender = "male" | "female" | "mixed";
export type Locale = "en" | "ms" | "ar";

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

/**
 * DB-backed university (migration 0022). Superset of the lean `University`
 * (which the sync proximity/seed paths still use) plus the editorial content
 * that used to live in `lib/seed/university-content.ts`. `id` is the UUIDv5
 * primary key (frozen NS_NOOK namespace); `slug` is the URL-stable token
 * (e.g. "um") that hrefs, the `?university=` filter, and proximity keys use.
 * Returned by `lib/data/universities.ts`. Admin-managed via /admin/universities.
 */
export interface UniversityRecord extends University {
  /** URL-stable token (e.g. "um"). For the seeded ten, equals the legacy id. */
  slug: string;
  /** Two-to-three plain sentences a student house-hunter needs. */
  description: string;
  /** Nearest rail/BRT stops by name. Coarse, no walk-time claims. */
  transit: string[];
  /** On-campus facts useful when choosing where to live. */
  campusFeatures: string[];
  /** Official site, https. */
  website: string;
  /** Campus photograph URL (hotlink-stable, e.g. Wikimedia Commons thumb). */
  photo: string;
  /** Commons file name backing `photo`, rendered as the attribution link. */
  photoFile: string;
  /** Soft-delete timestamp. Set → hidden from public reads. null → live. */
  deletedAt?: string;
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
  // ListingWithRelations and listing-card, wider than this one flag warrants.
  submittedAt?: string;
  verifiedAt?: string;
  deletedAt?: string;
  yearsActive: number;
  bio?: string;
  bovaepLicence?: string;
  // Verification fields (migration 0033). Optional because they live on the
  // base table only — `agents_public` (Phase H2) does not surface any of them,
  // so rowToPublicAgent leaves them undefined. The self path (rowToAgent,
  // AGENT_COLS) and the admin queue (service-role) carry them.
  licenceType?: AgentLicenceType;
  practisingState?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  verificationSubmittedAt?: string;
  // University lister fields (migration 0036). listerType/universityId are on the
  // public `agents_public` view (badge + profile need them). The remaining four
  // are self/admin-only (base table) — the public mapper leaves them undefined.
  // listerType is optional: undefined ⇒ 'agent', so seed agent fixtures and the
  // pre-0036 shape need no change.
  listerType?: ListerType;
  universityId?: string;
  contactPersonName?: string;
  contactPersonRole?: string;
  applicationNotes?: string;
  verificationNote?: string;
}

/** True when the agent row is a university lister (migration 0036). Centralises
 * the `listerType === "university"` check so callers don't scatter the literal. */
export function isUniversityLister(agent: Pick<Agent, "listerType">): boolean {
  return agent.listerType === "university";
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

export interface ListingWithRelations {
  listing: Listing;
  agent: Agent | null;
  area: Area | null;
}

/** A listing video, as surfaced to the public detail page: a resolved public
 * URL plus its accessible title (the a11y caption authored by the agent). */
export interface ListingVideoMeta {
  src: string;
  title: string;
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
   * private drafts carry null, published listings always have coordinates. */
  lat?: number;
  lng?: number;
  /** University campus siting (migration 0036). true ⇒ the listing is on the
   * lister university's campus: cards/detail show "On campus · {uni}" instead of
   * the computed distance, and address/lat/lng are set server-side from the
   * university record. false/undefined ⇒ a normal located listing. Only a
   * university lister may set this true (enforced in the publish server action). */
  onCampus?: boolean;
  /** Seed-only since 4c-B2 (compute-don't-claim). The DB columns
   * nearby_university_ids / walk_mins_to_campus / metres_to_campus were dropped
   * (migration 0019); proximity is computed at read from lat/lng + the
   * UNIVERSITY_BY_ID constant (lib/distance.ts). These fields survive only on
   * the seed objects (rls-test A2 parity) and are never emitted by rowToListing.
   * Vestigial, the A2-oracle rework LC removes the need for them. */
  nearbyUniversityIds?: string[];
  walkMinsToCampus?: number;
  metresToCampus?: number;
  amenities: string[];
  photos: string[];
  /** Resolved public video URLs + a11y titles, in sort order (4d). Optional:
   * videos are not a publish precondition, so most listings carry none. Seed
   * listings omit this; rowToListing emits [] when the listing has no videos. */
  videos?: ListingVideoMeta[];
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
