# Nook — Phase 1 Brief

This document is the working spec for Phase 1. It complements the visual design pack at `design-pack/`.

## What Nook is

A student rental discovery platform for the Klang Valley (Selangor + Kuala Lumpur), targeting six Malaysian universities. Two user types: **students** (browse, save, contact agents) and **agents** (BOVAEP-licensed, list properties, see analytics). There's also an internal admin panel for trust & safety moderation.

This is Mohamed's Final Year Project at City University Malaysia (BIT3043). The design has already been validated visually — Phase 1 is about translating those visuals into a real, typed, production-grade Next.js codebase.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server components by default |
| Language | TypeScript, strict mode | No `any`, no `ignoreBuildErrors` |
| Styling | Tailwind CSS v4 | CSS-vars-driven theme |
| Components | shadcn/ui | Themed to Nook tokens |
| Icons | lucide-react | One custom SVG (whatsapp) |
| Tooling | ESLint + Prettier | |

Phase 2 adds: Supabase (auth + DB), Recharts, React-Leaflet, Playwright.

## Folder structure (proposed)

```
nook/
├── app/
│   ├── layout.tsx                 # root: html dir, lang, navbar, footer, tweaks
│   ├── page.tsx                   # placeholder home (Phase 1)
│   ├── design-system/
│   │   └── page.tsx               # full DS showcase
│   └── globals.css                # tokens + base
├── components/
│   ├── ui/                        # shadcn primitives (themed)
│   ├── nook/
│   │   ├── icon.tsx               # lucide wrapper
│   │   ├── navbar.tsx             # server component
│   │   ├── footer.tsx             # server component
│   │   ├── listing-card.tsx       # server component
│   │   ├── tweaks-panel.tsx       # client component
│   │   └── ...
│   └── design-system/             # demo blocks for the /design-system route
├── lib/
│   ├── types.ts                   # Listing, Agent, University, Area, Review
│   ├── seed/
│   │   ├── listings.ts            # 18 seed listings
│   │   ├── agents.ts              # 6-8 seed agents
│   │   └── universities.ts        # 6 Klang Valley unis
│   └── utils.ts                   # cn(), formatPrice(), etc.
├── public/
│   └── seed-photos/               # placeholder photos for seed listings
├── design-pack/                   # the reference HTML (kept for ongoing reference)
└── tailwind.config.ts
```

## Tokens to translate

From `design-pack/tokens.css`, mapping to Tailwind theme + CSS vars:

**Colors** — every `--brand-*`, `--ink-*`, `--accent-*`, semantic (success/warning/danger/info), `--paper`, `--canvas`, `--whatsapp`. All as CSS custom properties on `:root` so the tweaks panel can swap them via `setProperty`.

**Type scale** — `--t-xxs` (10px) through `--t-3xl` (36px). Map to Tailwind's `text-*` utilities (e.g., `text-base` → 14px, not the default 16px).

**Radii** — `--r-xs` (2px) through `--r-pill` (999px). Note the Nook scale is tighter than Tailwind's default — base is 6px not 8px.

**Spacing** — `--s-1` (4px) through `--s-8` (32px). Tailwind already covers this well; the named tokens just exist for parity with the mocks.

**Shadows** — `--shadow-sticky`, `--shadow-card-hover`, `--shadow-modal`. Add to Tailwind's `boxShadow` config.

**Container width** — `--max-w: 1280px`.

## Tweaks panel behavior

Port `design-pack/tweaks.jsx` to a client component (`components/nook/tweaks-panel.tsx`):

- Floating panel, bottom-right, 280px wide, dismissible
- **Brand color** — three swatches (Olive, Burnt Orange, Red). On click, JS updates `--brand-50` through `--brand-700` via `document.documentElement.style.setProperty`. Persisted to `localStorage` under `nook.brand`.
- **Density** — Compact / Default / Roomy. Sets `data-density` on `<html>`. Persisted under `nook.density`.
- **Language** — EN / BM / AR. Sets `lang` and (for AR) `dir="rtl"` on `<html>`. Persisted under `nook.lang`. Phase 1 doesn't translate strings yet; this just verifies the structural piping works.
- Read state from `localStorage` on mount; apply before first paint to avoid flash.

The brand color swatches and their hex values are in `shared.jsx` line 370+ — copy them exactly.

## Component fidelity expectations

When porting to React/TS:

1. **Open the original HTML and the new component side-by-side.** Spacing, type sizes, and colors should match within 1-2px.
2. **Don't simplify.** If a card has a 1px `--ink-200` border, a 6px radius, and a hover shadow, the React version has all three.
3. **Don't add features.** Don't sneak in animations, dark mode, or extra states the mocks don't show.
4. **Don't subtract features.** The favourite heart on the listing card matters. The "✓ Verified" pill on agent cards matters. Ship what's drawn.
5. Where `shared.jsx` and an individual page mock disagree, **`shared.jsx` wins** — it's the abstracted reference.

## Seed data shape

Inferred from the mocks. Tighten as needed once you've read all of `design-pack/`.

```ts
// lib/types.ts
export type University = {
  id: string;
  name: string;          // "Universiti Malaya"
  shortName: string;     // "UM"
  city: string;          // "Kuala Lumpur"
  coords: { lat: number; lng: number };
  studentCount?: number;
};

export type Area = {
  id: string;
  name: string;          // "Bangsar"
  city: string;
  nearUniversities: string[]; // university ids
};

export type Agent = {
  id: string;
  name: string;
  agency?: string;
  avatarUrl?: string;
  verified: boolean;
  verifiedSince?: string; // ISO date
  bovaepId?: string;
  rating: number;        // 0-5
  reviewCount: number;
  responseRate?: number; // 0-1
  responseTime?: string; // "~2h"
  phone: string;
  whatsapp?: string;
  bio?: string;
  activeListings: number;
};

export type Listing = {
  id: string;
  title: string;
  type: "Whole unit" | "Master room" | "Single room" | "Studio";
  pricePerMonth: number;
  currency: "MYR";
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  areaId: string;
  areaName: string;       // denormalised for card render
  cityName: string;
  coords: { lat: number; lng: number };
  photos: string[];       // urls
  amenities: string[];    // "wifi", "parking", "ac", ...
  nearestUniversity: { id: string; name: string; minutesAway: number; mode: "walk" | "drive" | "transit" };
  agentId: string;
  badges?: ("featured" | "new" | "popular" | "verified")[];
  available: boolean;
  availableFrom?: string; // ISO date
  description?: string;
};

export type Review = {
  id: string;
  agentId: string;
  studentName: string;
  rating: number;
  text: string;
  date: string;
  subscores?: { responsiveness: number; honesty: number; helpfulness: number };
};
```

## Universities (seed)

The mocks reference six Klang Valley universities. Use these:

1. Universiti Malaya (UM) — KL
2. Universiti Kebangsaan Malaysia (UKM) — Bangi, Selangor
3. Universiti Putra Malaysia (UPM) — Serdang, Selangor
4. Universiti Teknologi MARA (UiTM) — Shah Alam, Selangor
5. Multimedia University (MMU) — Cyberjaya, Selangor
6. Sunway University — Subang Jaya, Selangor

## Areas (seed, partial)

Bangsar, Bangi, Cyberjaya, Subang Jaya, Serdang, Shah Alam, Petaling Jaya, Setapak. Match each to its closest universities.

## Listings (seed — 18)

Spread across types, prices, areas. Aim for the same visual variety as `listings.html`. Don't all use the same agent.

Photos: use placeholders for Phase 1. Either:
- Curated Unsplash collection (consistent look)
- Generic room photos in `public/seed-photos/`
- Or accept a stripey placeholder à la `placeholder-avatar` from tokens.css and revisit in Phase 2

Confirm preference with Mohamed before downloading anything.

## Open questions for Mohamed

These don't block starting Phase 1, but are worth resolving before Phase 2:

1. Photo strategy for seed data (above)
2. Map provider — confirm React-Leaflet (free, OSM) vs Mapbox
3. Confirm i18n library choice for Phase 5+ (next-intl is the obvious pick; lock in for translations)
4. Confirm Supabase project — same one as the existing PriceNest, or fresh project?

## Definition of done — Phase 1

Repeating from the kickoff prompt for emphasis:

- [ ] Clean `npm run dev` and `npm run build`
- [ ] `/design-system` matches `design-pack/design-system.html` visually
- [ ] Tweaks panel works end-to-end (brand, density, RTL all swap live)
- [ ] All 35 icons render correctly from lucide (plus the custom whatsapp SVG)
- [ ] Seed data types check; `<ListingCard/>` consumes a real seed listing
- [ ] Server components stay server components; only `TweaksPanel` (and shadcn primitives that need it) carry `"use client"`
- [ ] No TypeScript errors, no ESLint warnings, no console errors in dev
