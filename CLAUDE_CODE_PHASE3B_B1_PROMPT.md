# Claude Code — Phase 3b-B-1: Migrate Listings to Supabase (table + seed + helpers only)

This is checkpoint **3b-B-1**, the first of three checkpoints in Phase 3b-B.

- **3b-B-1 (this one):** Create the `listings` table, seed it from `lib/seed/listings.ts`, and switch the app's listing data access to read from the DB. Listings still reference areas and agents by **legacy string IDs**.
- **3b-B-2 (later):** Migrate `favourites.listing_id` / `recent_views.listing_id` to UUID foreign keys.
- **3b-B-3 (later):** Convert `Listing.areaId` / `Listing.agentId` from legacy strings to UUID FK references, delete the legacy-id bridge, finish the Option-P refactor.

**Do not do any 3b-B-2 or 3b-B-3 work in this checkpoint.** Scope discipline is the point of the three-checkpoint split.

**Before writing any code, produce a plan and wait for approval. Do not start implementation until the plan is reviewed.**

---

## Context

Listings currently live as a TypeScript seed file: `lib/seed/listings.ts`, typed by the `Listing` interface in `lib/types.ts`. This checkpoint moves listings into a Supabase table and switches the app to read from the DB.

Areas and agents already migrated in Phase 3b-A. The `areas` and `agents` tables exist, with UUID primary keys, slug columns, RLS (public SELECT only), and data-access helpers in `lib/data/areas.ts` and `lib/data/agents.ts`. A legacy-id bridge (`lib/data/legacy-id-bridge.ts`) translates legacy string IDs to slugs via the committed `scripts/.id-map-3ba.json` artifact.

After 3b-B-1, the `listings` seed file is **no longer the runtime source** for listings — but it stays physically in the repo, because the seed script reads it. It is deleted in 3b-B-3.

---

## Locked decisions — implement exactly. Do not silently change. Any change comes back as a question, not a shipped fact.

1. **`listings` gets a UUID primary key + a `slug` column.** No table keeps the old string `id` as a column — the slug is the human-readable handle. This matches the areas/agents pattern from 3b-A.

2. **Listing UUIDs are deterministic — UUIDv5 derived from the old string `id`** (`"lst-001"`), using the **same `NS_NOOK` namespace constant** already used by the 3b-A seed script. Do not introduce a new namespace. Re-running the seed must produce identical UUIDs (idempotent — same property proven by 3b-A's A1 test).

3. **Listing `slug`** is the existing seed `slug` verbatim (`"cosy-studio-bangsar-near-um"`). Do **not** re-derive it from `title`. The current seed slugs are already clean and URL-shaped.

4. **`area_id` and `agent_id` stay as `text` columns holding the legacy string IDs** (`"bangsar"`, `"agent-aisha"`) for this checkpoint. They are **not** converted to UUID FKs in 3b-B-1 — that is 3b-B-3. Listings continue to resolve area/agent relations through the existing legacy-id bridge, exactly as they do today. Do not wire a foreign key early.

5. **Every field on the `Listing` interface migrates literally.** The listing carries its own `lat`, `lng`, `city`, `state`, `nearby_university_ids` — these are denormalized (the area also carries location data). **Preserve the denormalization as-is.** Do not normalize "listing inherits location from area" — that is a schema redesign, out of scope, deferred. Migrate every column literally.

6. **Field name fidelity.** The `Listing` type uses `priceMonthly` and `sizeSqft`. These are the real current field names — migrate them verbatim (snake_case: `price_monthly`, `size_sqft`). Do **not** rename them to `pricePerMonth`, `sqft`, or any other variant. Same for `lat`/`lng` — keep as-is, do not convert to a point type or `coords`.

7. **Optional fields become nullable columns.** Every field marked optional on the `Listing` interface (`deposit`, `utilitiesIncluded`, `sizeSqft`, `genderPreference`, `minStayMonths`, `walkMinsToCampus`, `metresToCampus`, `rating`, `reviewCount`, `featured`, `listedToday`) is a nullable column. Note specifically: **`rating` and `reviewCount` are nullable on listings** — unlike agents, where they were `NOT NULL`. Do not carry the agent treatment over.

8. **`photos` is resolved data, not a literal.** The seed file stores `photos: galleryFor(0)` — a function call. The seed script must **invoke `galleryFor`** for each listing and store the resolved array of URLs in a `photos text[]` column. In the plan, report what `galleryFor(n)` returns (its signature and a sample output) so the resolved shape is confirmed before implementation.

9. **RLS: enabled on `listings`, with a public SELECT policy only** (`using (true)`). No INSERT/UPDATE/DELETE policy — writes denied to app code by default. Same posture as areas/agents. Preserves the "RLS always on" invariant.

10. **Seeding runs via a standalone script** using the **service-role key**, kept out of application code, env-driven (read from `.env.local`, never committed). Same pattern as `scripts/seed-3ba.mjs`. The script reads `lib/seed/listings.ts` directly — **no `.mjs` data mirror** of the seed array.

11. **The seed script produces a committed build artifact** mapping old string id → `{ uuid, slug }` for listings — e.g. `scripts/.id-map-3bb1.json`. 3b-B-3 will consume this map to migrate `Listing.areaId`/`agentId` references and the favourites/recent_views FKs. Commit it, do not gitignore it. Same decision as the 3b-A id-map.

---

## Filtering and search — Option A (fetch-all, in-memory), logic unchanged

The existing listing filter/sort logic lives in `lib/listings-search.ts` — `applyFilters`, `applySort`, `getFilteredListings`, `getSimilarListings`, and related helpers. This logic powers Phase 3a's URL-driven filters, gender filtering, and the saved-search feature.

**Do not rewrite this logic.** 3b-B-1 is a data-source swap, not a filtering rewrite.

- The new listings helper fetches **all** listings from the DB once, then hands the array to the **existing, unchanged** sync `applyFilters` / `applySort` functions.
- The listings table is seed-sized (dozens of rows); fetching all rows is cheap — the same reasoning behind 3b-A's `getAllAreas()` / `getAllAgents()` calls.
- The Phase 3a search-params logic — `parseListingSearchParams`, `serializeListingSearchParams`, the canonical-form round-trip, gender filtering — must be **byte-for-byte untouched**.

### Future-efficiency seam (required, but not built now)

Pushing filtering into the database query (so the DB returns only matching rows) is a real optimization for production scale — but it is **out of scope for 3b-B-1** and must not be built here. However, the helper must be **structured so that swapping to DB-side filtering later is a contained change, not a rewrite**:

- All listing data access goes through a single module — `lib/data/listings.ts`.
- The filter/sort logic stays isolated in `lib/listings-search.ts` and operates on a plain `Listing[]`.
- The helper exposes one clear seam — a "fetch listings" function — whose internals can later change from "fetch all" to "fetch filtered" **without touching components or the search-params logic**.

Add a deferred-debt entry to `LATE_CATCHES.md`: *"Listings filtering is fetch-all-then-filter-in-memory (Option A). Move to DB-side filtering if listing count grows large — revisit before production scale. The `lib/data/listings.ts` fetch seam is structured for this swap."*

---

## What to build

- A Supabase `listings` table with columns matching the `Listing` interface in `lib/types.ts`, under the locked decisions above. A migration (SQL) creating the table, its constraints (UUID PK, unique slug, an index on `slug`, an index on `area_id` and `agent_id` since those are looked up), and the RLS enable + public SELECT policy.
- An idempotent seed script (decisions 10 + 11), reading `lib/seed/listings.ts`, resolving `galleryFor`, deriving UUIDv5 ids, writing the committed id-map artifact.
- A `lib/data/listings.ts` data-access module — `getAllListings()`, `getListingBySlug(slug)`, and whatever the current consumers need — reading from Supabase, `import "server-only"`, anon-key client (RLS-bound). Mirrors the style of `lib/data/areas.ts` / `lib/data/agents.ts`.
- Switch every current consumer of `lib/seed/listings.ts` over to the new helpers. **Find them by grep** and report the list — do not work from memory.
- The filter/sort logic in `lib/listings-search.ts` stays as-is; only its data source changes.

## Out of scope — do not touch

- `favourites` and `recent_views` tables, their columns, or any FK work — that is 3b-B-2.
- Converting `Listing.areaId` / `Listing.agentId` to UUID — that is 3b-B-3.
- Deleting the legacy-id bridge or `lib/seed/listings.ts` — both stay until 3b-B-3.
- Any rewrite of `applyFilters` / `applySort` / search-params logic.
- Area or agent detail pages.
- Image upload / Supabase Storage — `photos` stores the resolved URL strings as-is.

---

## Acceptance section — include in the implementation as a deliverable

Produce `scripts/rls-test-3bb1.mjs` (or extend the existing pattern), anon-key, env-driven, exits 0/1. At minimum:

- **A1 — Idempotency:** run the seed script twice; assert a stable content hash on the `listings` table across both runs (hash a column that would change if the upsert churned rows — include `updated_at` in the hash, per the 3b-A A1 correction).
- **A2 — Shape parity + UUID derivation:** `getListingBySlug("cosy-studio-bangsar-near-um")` returns a `Listing` whose every field except `id` matches the seed object `lst-001`. Assert `.id` equals `uuidv5("lst-001", NS_NOOK)`. Run the check against the **helper output** (the shared row-mapper), not the raw DB row.
- **A3 — RLS:** anon SELECT returns the **full expected listing count** (read the count from the id-map, not a hardcoded literal — and not `.limit(1)`). Anon INSERT denied with a real RLS error. Anon UPDATE / DELETE denied (target real seeded rows, assert 0 rows affected).
- **A4 — Build + import hygiene:** `next build` exits 0. Grep `from "@/lib/seed/listings"` across `app/`, `components/`, `lib/data/` → zero matches (the seed file is read only by the seed script). `npm run lint` delta is zero.

---

## Deliver the plan first

In the plan, explicitly state:

- The full column list and SQL type for each `listings` column, mapped from the `Listing` interface, with nullability.
- What `galleryFor(n)` returns (signature + sample), and how `photos` is resolved.
- The UUIDv5 derivation (confirm reuse of the existing `NS_NOOK` constant).
- The list of files that import `lib/seed/listings.ts` today — from an actual grep.
- Confirmation that `favourites`, `recent_views`, the legacy-id bridge, `Listing.areaId`/`agentId` types, and `applyFilters`/`applySort` are all untouched.
- The `lib/data/listings.ts` fetch-seam design (decision: future DB-side filtering).

Wait for review before implementing.
