import type { Review } from "@/lib/types";

export const REVIEWS: Review[] = [
  // agent-aisha — UM/Bangsar/PJ
  {
    id: "rev-aisha-1",
    agentId: "agent-aisha",
    reviewerName: "Liyana, UM Year 2",
    rating: 5,
    comment:
      "Aisha replied within 10 minutes on WhatsApp. Did the viewing the next day at the Bangsar unit, the studio was exactly like the photos. Smooth move-in, deposit terms in writing.",
    date: "2026-04-18",
  },
  {
    id: "rev-aisha-2",
    agentId: "agent-aisha",
    reviewerName: "Daniel, Monash MUM Year 3",
    rating: 5,
    comment:
      "Honest about the deposit and SPA terms upfront. No hidden agency fee, no last-minute surprises. Renewed for a second year through her.",
    date: "2026-03-30",
  },
  {
    id: "rev-aisha-3",
    agentId: "agent-aisha",
    reviewerName: "Anonymous",
    rating: 4,
    comment:
      "Decent agent. Took a couple of days to send the tenancy agreement back, but everything else was fine.",
    date: "2026-02-22",
  },

  // agent-faiz — UKM/UPM/UiTM
  {
    id: "rev-faiz-1",
    agentId: "agent-faiz",
    reviewerName: "Hakim, UKM Year 2",
    rating: 5,
    comment:
      "Knows Bandar Baru Bangi inside out. Walked me through three units in one afternoon, all within 10 minutes of UKM main gate. Picked one on the spot.",
    date: "2026-04-12",
  },
  {
    id: "rev-faiz-2",
    agentId: "agent-faiz",
    reviewerName: "Iman, UPM Year 1",
    rating: 5,
    comment:
      "Helped me sort the utilities deposit with TNB and the wifi handover. First-time renter, he made it painless.",
    date: "2026-03-15",
  },
  {
    id: "rev-faiz-3",
    agentId: "agent-faiz",
    reviewerName: "Rashid, UiTM Shah Alam",
    rating: 4,
    comment:
      "Solid agent for Shah Alam units. Note he's busy on weekends — book viewings on weekdays for a faster reply.",
    date: "2026-02-28",
  },

  // agent-mei — Sunway/Monash/Taylor's
  {
    id: "rev-mei-1",
    agentId: "agent-mei",
    reviewerName: "Vincent, Sunway University",
    rating: 5,
    comment:
      "Mei Lin showed me the canopy walk to Sunway during the viewing — the unit really is a 6-minute walk. No exaggeration on the listing.",
    date: "2026-04-20",
  },
  {
    id: "rev-mei-2",
    agentId: "agent-mei",
    reviewerName: "Chia, Monash MUM",
    rating: 5,
    comment:
      "Studio in Union Suites was move-in ready. Bedsheets, kettle, even hangers in the wardrobe. Worth every ringgit of the rate.",
    date: "2026-04-02",
  },
  {
    id: "rev-mei-3",
    agentId: "agent-mei",
    reviewerName: "Anon, Taylor's Lakeside",
    rating: 5,
    comment:
      "She holds the deposit cheque made out to the landlord directly, not to her. That's how it should be done.",
    date: "2026-03-08",
  },

  // agent-priya — Cyberjaya/MMU
  {
    id: "rev-priya-1",
    agentId: "agent-priya",
    reviewerName: "Tan, MMU Cyberjaya Year 2",
    rating: 5,
    comment:
      "Got me a D'Pulze unit two weeks before semester started. The pool and gym access were a real bonus for the price.",
    date: "2026-04-15",
  },
  {
    id: "rev-priya-2",
    agentId: "agent-priya",
    reviewerName: "Hafiz, MMU Year 3",
    rating: 5,
    comment:
      "Patient with my parents on the WhatsApp video tour from KL. Answered every question about the maintenance fee and aircon servicing.",
    date: "2026-03-20",
  },
  {
    id: "rev-priya-3",
    agentId: "agent-priya",
    reviewerName: "Anonymous",
    rating: 4,
    comment:
      "Good Cyberjaya knowledge. The Cyberia building she suggested is older — fair pricing for what you get.",
    date: "2026-02-12",
  },

  // agent-ben — Cheras/UCSI/Setapak
  {
    id: "rev-ben-1",
    agentId: "agent-ben",
    reviewerName: "Wei Jian, UCSI Cheras Year 2",
    rating: 5,
    comment:
      "Walking distance to UCSI like the listing said — 7 minutes via the back lane. Ben pointed out the late-night Mamak too, which I appreciated.",
    date: "2026-04-08",
  },
  {
    id: "rev-ben-2",
    agentId: "agent-ben",
    reviewerName: "Sara, IIUM Setapak",
    rating: 4,
    comment:
      "PV21 Setapak unit is female-only as advertised. Took two days to confirm availability but the contract was clean.",
    date: "2026-03-22",
  },
  {
    id: "rev-ben-3",
    agentId: "agent-ben",
    reviewerName: "Anon",
    rating: 5,
    comment:
      "Affordable Cheras options. Ben doesn't oversell — he tells you which units are tired and which are freshly repainted.",
    date: "2026-02-18",
  },

  // agent-arif — IIUM/Gombak (unverified)
  {
    id: "rev-arif-1",
    agentId: "agent-arif",
    reviewerName: "Iskandar, IIUM Gombak",
    rating: 4,
    comment:
      "Friendly and quick on Telegram. The Greenwood unit was fine, just note the bus to IIUM gate runs every 20 minutes.",
    date: "2026-04-01",
  },
  {
    id: "rev-arif-2",
    agentId: "agent-arif",
    reviewerName: "Anonymous",
    rating: 4,
    comment:
      "Independent agent — not BOVAEP-listed yet. Worked out fine for me but ask for a written tenancy before paying.",
    date: "2026-03-05",
  },
  {
    id: "rev-arif-3",
    agentId: "agent-arif",
    reviewerName: "Faris, IIUM Year 1",
    rating: 5,
    comment:
      "Got the Gombak room sorted within a week of asking. Fair deposit, no extra fees.",
    date: "2026-02-25",
  },
];

// Review entries carry the legacy agent id; the detail page indexes by agent
// slug since 3b-B-3 (Listing.agentId is now a UUID, not the legacy id, so the
// page resolves the Agent first and looks up reviews by its stable slug).
const AGENT_SLUG_BY_LEGACY_ID: Record<string, string> = {
  "agent-aisha": "aisha-rahman",
  "agent-faiz": "faiz-othman",
  "agent-mei": "mei-lin-chong",
  "agent-arif": "arif-hakim",
  "agent-priya": "priya-devi",
  "agent-ben": "ben-tan",
};

export const REVIEWS_BY_AGENT: Record<string, Review[]> = REVIEWS.reduce(
  (acc, r) => {
    if (!r.agentId) return acc;
    const slug = AGENT_SLUG_BY_LEGACY_ID[r.agentId] ?? r.agentId;
    (acc[slug] ??= []).push(r);
    return acc;
  },
  {} as Record<string, Review[]>,
);
