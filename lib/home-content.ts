// Homepage stats are COMPUTED at render (compute-don't-claim): see
// lib/data/home-stats.ts. The old hardcoded HOME_STATS / BIG_CTA_STATS
// marketing figures were removed — every number shown now derives from the DB.

// Split-hero photo deck (3 stacked cards, right column)
export const HERO_DECK: [string, string, string] = [
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=900&q=75",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=640&q=75",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=640&q=75",
];
// No fabricated walk-times (compute-don't-claim, 4c-B2), price matches the
// real cheapest seed listing within 5 km of UM.
export const HERO_DECK_PILL = "Rooms near UM from RM 650/mo";

// Real KL skyline (Wikimedia Commons, hotlink-stable, URL HEAD-verified).
export const BIG_CTA_IMAGE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Kl-skyline-at-night-2022.jpg/1280px-Kl-skyline-at-night-2022.jpg";

// Cycled by the hero search input's typewriter placeholder
export const HERO_SEARCH_HINTS = [
  "UM, UKM, Bangsar…",
  "Near Sunway, under RM 600…",
  "Taylor's, female-only…",
  "Cyberjaya, move in June…",
];

// Every href here must satisfy the URL filter contract in lib/listings-search.ts
// (parseListingSearchParams). There is deliberately NO gender chip: gender is
// identity-driven (profile preference), it has no URL param by design.
export const QUICK_CHIPS: { label: string; href: string }[] = [
  { label: "Near UM", href: "/listings?universityId=um" },
  { label: "Near UKM (Bangi)", href: "/listings?universityId=ukm" },
  { label: "Near Sunway", href: "/listings?universityId=sunway" },
  { label: "Studios", href: "/listings?type=studio" },
  { label: "Under RM 500", href: "/listings?maxPrice=500" },
  { label: "Furnished", href: "/listings?furnished=1" },
];

// The "Browse by university" rail no longer carries static photo/count/price
// data, components/home/university-rail.tsx derives all of it at read (real
// Wikimedia campus photos from lib/seed/university-content.ts + counts and
// from-prices computed from listing coordinates). Compute-don't-claim.

export interface FeaturedAgentExtra {
  /** Agent slug (URL-stable). Keyed by slug, not legacy id, since 3b-B-3. */
  agentSlug: string;
  activeListings: number;
  areasServed: string;
}

// Top 3 by rating desc, reviewCount tiebreak (mei/aisha/priya).
// activeListings + areasServed are display-only marketing data.
export const FEATURED_AGENT_EXTRAS: FeaturedAgentExtra[] = [
  { agentSlug: "mei-lin-chong", activeListings: 18, areasServed: "Sunway · Subang · USJ" },
  { agentSlug: "aisha-rahman", activeListings: 24, areasServed: "UM · Bangsar · PJ" },
  { agentSlug: "priya-devi", activeListings: 31, areasServed: "Cyberjaya · MMU · Putrajaya" },
];
