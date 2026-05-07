export interface HomeStat {
  value: string;
  label: string;
}

export const HOME_STATS: HomeStat[] = [
  { value: "12,400+", label: "Verified rooms across Klang Valley" },
  { value: "2,800", label: "REN/PEA-licensed agents" },
  { value: "38h", label: "Average enquiry-to-tenancy" },
  { value: "4.7 ★", label: "Average agent rating" },
];

export const BIG_CTA_STATS: HomeStat[] = [
  { value: "40k+", label: "monthly searchers" },
  { value: "2,800", label: "verified agents" },
  { value: "38h", label: "avg time to rent" },
  { value: "RM 0", label: "commission per rental" },
];

export const HERO_IMAGE_URL =
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1920&q=80";

export const HERO_HEADLINE = "Find your room near campus, without the runaround.";
export const HERO_LEDE =
  "12,000+ verified rooms across the Klang Valley. Photo-first, agent-vetted, students only. Move in by next semester.";

export const QUICK_CHIPS: { label: string; href: string }[] = [
  { label: "Near UM", href: "/listings?universityId=um" },
  { label: "Near UKM (Bangi)", href: "/listings?universityId=ukm" },
  { label: "Near Sunway", href: "/listings?universityId=sunway" },
  { label: "Female-only", href: "/listings?gender=female" },
  { label: "Under RM 500", href: "/listings?maxPrice=500" },
  { label: "Furnished", href: "/listings?furnishing=full" },
];

export interface UniversityRailItem {
  universityId: string;
  displayName: string;
  photoUrl: string;
  listingCount: number;
  fromPriceMonthly: number;
}

// Unsplash w=410 sized for ~205px CSS card width at 2x
export const UNIVERSITY_RAIL: UniversityRailItem[] = [
  {
    universityId: "um",
    displayName: "Universiti Malaya",
    photoUrl: "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=410&q=70",
    listingCount: 2140,
    fromPriceMonthly: 350,
  },
  {
    universityId: "ukm",
    displayName: "UKM Bangi",
    photoUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=410&q=70",
    listingCount: 1820,
    fromPriceMonthly: 280,
  },
  {
    universityId: "sunway",
    displayName: "Sunway University",
    photoUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=410&q=70",
    listingCount: 1450,
    fromPriceMonthly: 420,
  },
  {
    universityId: "upm",
    displayName: "UPM Serdang",
    photoUrl: "https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=410&q=70",
    listingCount: 980,
    fromPriceMonthly: 320,
  },
  {
    universityId: "monash",
    displayName: "Monash Sunway",
    photoUrl: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=410&q=70",
    listingCount: 740,
    fromPriceMonthly: 480,
  },
  {
    universityId: "taylors",
    displayName: "Taylor's",
    photoUrl: "https://images.unsplash.com/photo-1568667256549-094345857637?w=410&q=70",
    listingCount: 680,
    fromPriceMonthly: 460,
  },
];

export interface FeaturedAgentExtra {
  agentId: string;
  activeListings: number;
  areasServed: string;
}

// Top 3 by rating desc, reviewCount tiebreak (mei/aisha/priya).
// activeListings + areasServed are display-only marketing data.
export const FEATURED_AGENT_EXTRAS: FeaturedAgentExtra[] = [
  { agentId: "agent-mei", activeListings: 18, areasServed: "Sunway · Subang · USJ" },
  { agentId: "agent-aisha", activeListings: 24, areasServed: "UM · Bangsar · PJ" },
  { agentId: "agent-priya", activeListings: 31, areasServed: "Cyberjaya · MMU · Putrajaya" },
];
