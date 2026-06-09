import type { Agent } from "@/lib/types";

// Seed input shape: the domain Agent minus DB-generated / audit fields. `id`
// here holds the legacy seed id (e.g. "agent-arif"), which scripts/seed-3ba.mjs
// resolves to a deterministic uuidv5 under the frozen namespace. submitted_at /
// verified_at / deleted_at / status_reason are NOT carried here — the seed
// script sets verified_at / status_reason at insert time, and submitted_at /
// deleted_at fall to DB defaults (now() / null). Imported only by scripts/
// (no app/lib/components reachability — same posture as LC-09 for listings).
export type SeedAgent = Omit<
  Agent,
  "submittedAt" | "verifiedAt" | "deletedAt" | "statusReason"
>;

// Seed slugs are hardcoded to match what scripts/seed-3ba.mjs derives via
// slugify(name) — agents already in scripts/.id-map-3ba.json. If you rename
// an agent here you MUST re-run seed-3ba and re-derive the id-map; the
// rls-test asserts these two stay in sync.
export const AGENTS: SeedAgent[] = [
  {
    id: "agent-aisha",
    slug: "aisha-rahman",
    name: "Aisha Rahman",
    agency: "Nook Verified",
    rating: 4.8,
    reviewCount: 127,
    responseTimeMins: 12,
    languages: ["en", "ms"],
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
    whatsapp: "+60123456701",
    phone: "+60123456701",
    email: "aisha@nook.my",
    status: "approved",
    yearsActive: 6,
    bio: "Specialises in PJ and Bangsar student rentals.",
    bovaepLicence: "E(3)2148",
  },
  {
    id: "agent-faiz",
    slug: "faiz-othman",
    name: "Faiz Othman",
    agency: "Bangi Properties",
    rating: 4.6,
    reviewCount: 89,
    responseTimeMins: 25,
    languages: ["en", "ms"],
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    whatsapp: "+60123456702",
    phone: "+60123456702",
    email: "faiz@bangiprop.my",
    status: "approved",
    yearsActive: 4,
    bio: "UKM and UPM rooms and houses.",
    bovaepLicence: "E(3)1827",
  },
  {
    id: "agent-mei",
    slug: "mei-lin-chong",
    name: "Mei Lin Chong",
    agency: "Sunway Homes",
    rating: 4.9,
    reviewCount: 211,
    responseTimeMins: 8,
    languages: ["en", "ms"],
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80",
    whatsapp: "+60123456703",
    phone: "+60123456703",
    email: "meilin@sunwayhomes.my",
    status: "approved",
    yearsActive: 8,
    bio: "Subang Jaya, Sunway, Monash, Taylor's portfolio.",
    bovaepLicence: "E(3)0934",
  },
  {
    id: "agent-arif",
    slug: "arif-hakim",
    name: "Arif Hakim",
    // Backfilled to satisfy the new NOT NULL constraints (LOCK-4.23 option iii).
    // Arif is re-authored as the rejected-agent exemplar for the admin queue.
    agency: "Independent",
    rating: 4.4,
    reviewCount: 54,
    responseTimeMins: 40,
    languages: ["en", "ms", "ar"],
    avatarUrl: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&q=80",
    whatsapp: "+60123456704",
    phone: "+60123456704",
    email: "arif.hakim@gmail.com",
    status: "rejected",
    yearsActive: 2,
    bio: "IIUM and Gombak listings.",
    // Standardized to the BOVAEP E(n)NNNN format (was the non-standard placeholder
    // "PENDING-ARIF-001"). Migration 0026 normalizes the already-seeded live row to
    // this same value. Unique vs the other five live licences (0025 partial index).
    bovaepLicence: "E(3)0001",
  },
  {
    id: "agent-priya",
    slug: "priya-devi",
    name: "Priya Devi",
    agency: "Cyber City Realty",
    rating: 4.7,
    reviewCount: 142,
    responseTimeMins: 18,
    languages: ["en", "ms"],
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    whatsapp: "+60123456705",
    phone: "+60123456705",
    email: "priya@cybercity.my",
    status: "approved",
    yearsActive: 5,
    bio: "Cyberjaya and MMU specialist.",
    bovaepLicence: "E(3)2305",
  },
  {
    id: "agent-ben",
    slug: "ben-tan",
    name: "Ben Tan",
    agency: "KL Student Living",
    rating: 4.5,
    reviewCount: 76,
    responseTimeMins: 30,
    languages: ["en", "ms"],
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    whatsapp: "+60123456706",
    phone: "+60123456706",
    email: "ben@klstudent.my",
    status: "approved",
    yearsActive: 3,
    bio: "Cheras, UCSI, Setapak rooms.",
    bovaepLicence: "E(3)2611",
  },
];

export const AGENT_BY_ID = Object.fromEntries(
  AGENTS.map((a) => [a.id, a]),
) as Record<string, SeedAgent>;
