# Nook

**Verified student rentals in the Klang Valley.**

### 🔗 Live app: **[nook-ten-ecru.vercel.app](https://nook-ten-ecru.vercel.app)**

A production-grade, multi-tenant housing marketplace for Malaysian university students: browse
verified rooms near campus, filter by real constraints (budget, distance to campus, gender
preference, amenities), and see a 3-month rent forecast per area from a trained regression model.
Built end to end, from Postgres schema and row-level security to the design system and the ML
pipeline behind the price projections.

Built with Next.js 16 (App Router), React 19, Supabase (Postgres + Auth + Storage + RLS),
TypeScript, Tailwind 4, and a Python/scikit-learn forecasting model.

---

## Table of contents

- [Why this project is interesting](#why-this-project-is-interesting)
- [What you can do on the live site](#what-you-can-do-on-the-live-site)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [The rent forecast model](#the-rent-forecast-model)
- [Security model](#security-model)
- [Performance work](#performance-work)
- [Internationalisation](#internationalisation)
- [Testing](#testing)
- [Running it locally](#running-it-locally)
- [Repo layout](#repo-layout)
- [Engineering docs in this repo](#engineering-docs-in-this-repo)
- [Status and roadmap](#status-and-roadmap)

---

## Why this project is interesting

Student housing in the Klang Valley is a trust problem, not a listings problem. Fake listings,
unlicensed agents, and stale prices are the norm. Nook is designed around that:

| Problem | What Nook does about it |
| --- | --- |
| Anyone can claim to be an agent | Agents register with a BOVAEP licence number, verify a phone by OTP, upload documents, and pass an admin approval queue before a single listing goes live |
| Universities run their own housing but have no channel | Universities onboard as a second lister type on the same pipeline, verified by admin outreach to the official switchboard, and their listings carry a distinct "Listed by the university" badge |
| Students cannot tell if a price is fair, or where it is heading | Every area page carries a 3-month rent projection from a trained model, rebased onto that area's real median listing price and labelled as an estimate |
| "Near campus" means nothing | Listings carry coordinates; distance to every nearby campus is computed and filterable, and on-campus university listings take their location from the campus record server-side |
| Trust claims need a mechanism | Data access is enforced in the database with row-level security, and that enforcement is covered by an executable test suite rather than a promise |

The interesting engineering is in the boring places: a database that refuses to leak, a service-role
key that a linter physically prevents from spreading, and a read path that was measured and then
pushed into SQL.

## What you can do on the live site

Sign-up is open, so all three roles are explorable.

**As a student (no account needed to browse)**

- Search and filter listings by price, area, property type, beds, furnishing, move-in date, gender preference, and amenities
- Switch between list and map views (Google Maps), with a photo lightbox on each listing
- Browse by **university** (UM, UKM, UPM, UiTM, MMU, Sunway and more) or by **area**, each with computed stats and the rent projection
- Read the **Essentials** guide (transport, utilities, getting set up)
- With an account: save favourites, save searches, and see recently viewed listings, all from `/account`
- Delete your account yourself, permanently, including stored files

**As an agent or a university**

- Register, verify a phone by OTP, submit a licence and documents, and wait in a real approval queue
- Once approved: a dashboard to create, edit, publish, archive, and unpublish listings, with photo and video upload and a Google Maps link picker that resolves coordinates
- Universities get the same dashboard plus an "on campus" toggle that fills location from the campus record

**As an admin**

- Approve or reject pending agents and universities, with a required note persisted for the audit trail
- Manage the university directory, including duplicate rejection by name and by location (campuses within 200 m are treated as the same place)
- Admin routes are invisible to non-admins rather than merely forbidden

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16, App Router, Server Components, Server Actions, Turbopack |
| UI | React 19.2, Tailwind CSS 4, `motion` for animation, custom design tokens |
| Language | TypeScript, `strict: true` |
| Data | Supabase Postgres, accessed via `@supabase/ssr` |
| Auth | Supabase Auth, cookie sessions, JWT claims verified in middleware |
| Authorisation | Postgres row-level security, plus route middleware, plus server-side checks |
| Storage | Supabase Storage buckets for listing photos, listing videos, avatars, agent documents |
| Maps | Google Maps via `@vis.gl/react-google-maps` |
| ML | Python, scikit-learn, statsmodels, FastAPI serving layer |
| Testing | Playwright end-to-end, Node RLS harnesses, pytest for the model |
| Hosting | Vercel, with Speed Insights |

## Architecture

```
Browser
   │
   ├─ middleware.ts ──────────── session refresh + route gating (JWT claims, no DB read)
   │
   ▼
Next.js App Router (Server Components)
   │
   ├─ lib/data/*.ts ─────────── the only read boundary; row mappers, no leaking DB shapes
   ├─ app/**/actions.ts ─────── Server Actions for every write (15 route modules)
   │
   ▼
Supabase Postgres
   ├─ RLS policies on every table         ← the real authorisation layer
   ├─ RPCs: current_agent_id, licence_exists, slug_exists, OTP lifecycle, submit_verification
   └─ Storage buckets with per-owner policies
```

Design decisions worth calling out:

- **Reads and writes are separated by convention and enforced by review.** Every read goes through
  `lib/data/`, which maps database rows into domain types (`lib/types.ts`) so route components never
  see raw column names. Every write is a Server Action next to the route that owns it.
- **Authorisation is defence in depth.** Middleware gates by JWT claim, the layout returns a 404 for
  admin routes, server actions re-check, and RLS is the backstop that holds even if all three are
  bypassed.
- **Middleware never touches the database.** Session validation uses `auth.getClaims()` for a local
  JWKS signature check instead of a network round-trip to Supabase Auth on every request.
- **Slugs, not IDs, in public URLs**, with collision-safe derivation shared by the agent and
  university flows (`lib/data/unique-slug.ts`).
- **Schema evolves through numbered SQL migrations** (0001 to 0038, with 0030 onward in this repo),
  never ad-hoc console edits.

## The rent forecast model

The flagship analytical feature. Full write-up in [`Prediction Model/rent-forecast/README.md`](Prediction%20Model/rent-forecast/README.md).

**Task.** Given everything known about a rental facility at month *t*, predict its monthly rent at
*t+1*, *t+2*, and *t+3*.

**Data.** A Malaysian rental panel of 520 facilities across 10 states and 28 districts, monthly from
January 2019 to December 2025, roughly 43,700 rows.

**Approach.**

- **Direct multi-horizon forecasting**: three separate pipelines, same features, one target per
  horizon. Direct rather than recursive, so errors do not compound across horizons.
- **Temporal split, never random**: train 2019 to 2023, validate on 2024, test on 2025 once.
- **Leakage-proof pipeline**: `ColumnTransformer` (median impute + `StandardScaler` for numerics,
  most-frequent impute + one-hot for categoricals) into `LinearRegression`, every transform fitted
  on the training fold only.
- **Engineered time features**: cyclical `month_sin` / `month_cos` plus a `months_since_start` trend
  counter, so the model extrapolates past the training window instead of memorising raw years.
- **Baselines**: compared against naive (carry-forward) and drift baselines at every horizon.

**Results on the 2025 holdout**

| Horizon | R² | MAPE |
| --- | --- | --- |
| t+1 | 0.944 | ~13% |
| t+2 | 0.928 | ~16% |
| t+3 | 0.924 | ~17% |

**How it reaches the product.** The model is trained offline and exported as a snapshot of
**percentage changes** per area and horizon (`lib/seed/rent-forecast.json`). The panel behind the
model is not Nook's own inventory, so its absolute rents are the wrong scale for student rooms. The
app therefore rebases those percentages onto each area's real median listing price
(`lib/data/rent-forecast.ts`), and areas without a panel proxy simply show no forecast rather than a
fabricated one. Projections are always presented as estimates.

A FastAPI service (`/predict`, `/predict/batch`, `/predict/areas`, `/model/info`) serves the same
models for live prediction, and 21 pytest tests cover feature engineering, leakage guards, the
pipeline, and the API.

## Security model

The part I would most want a reviewer to look at.

- **Row-level security on every table.** Students see only their own favourites, searches, and view
  history. Agents can only mutate their own listings and photos. Soft-deleted agents lose access
  through `current_agent_id()` rather than through application code remembering to check.
- **RLS is tested, not assumed.** `scripts/rls-test-*.mjs` drive real Supabase clients as real users
  and assert both that permitted operations succeed and that forbidden ones fail. Runnable per area:
  `npm run rls-test:4b`, `rls-test:university`, `rls-test:agentflow`, and so on.
- **Service-role containment is linted.** The service-role key bypasses RLS entirely, so a custom
  linter (`scripts/lint-service-role-containment.mjs`, wired into `npm run lint`) allowlists the
  exact files permitted to import it. Adding a new importer fails the lint. Outside the admin
  surface there is exactly one such file: account deletion.
- **Account deletion is a hard delete, in a safe order.** Listings are demoted, then deleted, then
  the agent row, then storage objects, then the auth user last, so foreign keys never block a
  partial run. Each step is idempotent, database deletions fail closed, and storage removals are
  best-effort with logged failures. Admins are refused server-side, not just hidden in the UI.
- **Agent identity is verified before publication**: BOVAEP licence uniqueness checked at the
  database level, phone verified by hashed OTP, documents reviewed by a human.
- **Redirects are validated** (`lib/safe-redirect.ts`) so `?redirect=` cannot be used to bounce a
  user off-site after login.

## Performance work

Both of these were measured problems, then fixed.

- **Listing filters pushed into Postgres.** The read path used to fetch the whole listings table and
  filter in JavaScript. Sargable predicates (price, area, type, beds, furnishing, move-in date,
  gender, amenities) are now pushed into the query and cached per filter combination with a
  canonical cache key and a tagged 300s TTL. The in-memory pass is kept and is never stricter than
  its SQL twin, so results stay identical. Supporting composite indexes live in migration 0038.
  Free-text search and university-distance ranking stay in memory by design.
- **Images sized at the edge.** Listing photos were served as stored originals everywhere, so a card
  thumbnail pulled the same ~270 KB file as the lightbox. `sizedPhotoUrl()` rewrites public object
  URLs onto Supabase's image transform endpoint with an explicit width and quality, and every
  consumer requests roughly 2x its rendered size. A sample card photo dropped from 268 KB to 107 KB;
  map and mini variants shrink far more.

[`SCALING.md`](SCALING.md) is a full audit of what breaks next, with a phased plan from 10k to 1M
users, honest cost estimates, and an explicit list of what was **not** verified.

## Internationalisation

Three locales shipped: **English, Malay, and Arabic**, the last with full right-to-left layout
(`dir` set at the html element, direction-aware styling throughout). Dictionaries are typed and kept
at key parity across all three, and the locale is resolved server-side so the first paint is already
correct.

## Testing

| Suite | What it covers | Run |
| --- | --- | --- |
| Playwright end-to-end | Guest browsing and the listings URL filter contract, login errors and role-aware routing, favourites, the agent dashboard and create-listing flow, the pending wall, university onboarding, and the admin middleware contract. Guest flows repeat at a Pixel 7 viewport | `npm run test:e2e` |
| RLS harnesses | Per-policy authorisation assertions driven as real users through real Supabase clients | `npm run rls-test:*` |
| Flow test | Account deletion end to end, including storage cleanup | `npm run flow-test:account-deletion` |
| Model tests | Feature engineering, leakage guards, pipeline, FastAPI endpoints (21 pytest tests) | `pytest` in `Prediction Model/rent-forecast` |
| Lint and types | ESLint plus service-role containment, and `tsc --noEmit` | `npm run lint`, `npm run typecheck` |

The Playwright setup seeds four ephemeral Supabase users through the service role, signs each in
through the real login form, stores per-role storage state, and tears every seeded row and user back
down afterwards, children first.

## Running it locally

Requires Node 22+ (the seed and test scripts use `--experimental-strip-types`) and a Supabase
project.

```bash
npm install
npm run dev        # http://localhost:3000
```

Create `.env.local` with:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client key, RLS applies |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations only, bypasses RLS, never sent to the client |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps and the link-based location picker |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Map style id |
| `RLS_TEST_USER_A/B_EMAIL` + `_PASSWORD` | Only needed to run the RLS harnesses |

Then apply `supabase/migrations/*.sql` in order and seed:

```bash
npm run seed:universities     # campuses
npm run seed:3ba              # areas and agents
npm run seed:3bb1             # listings and photos
npm run promote-to-admin      # grant yourself the admin role
```

The forecast model is independent of the web app:

```bash
cd "Prediction Model/rent-forecast"
pip install -r requirements.txt
python -m src.train        # fits the three horizons
python -m src.evaluate     # 2025 test metrics vs baselines
uvicorn api.main:app       # serving layer
```

There is also a `/design-system` route showing the full token set, components, and states. It is
development-only and returns 404 in production.

## Repo layout

```
app/                      routes; 37 pages, colocated actions.ts per write surface
  listings/ areas/ universities/    public browse surfaces
  agents/   universities/register   lister registration, verification, dashboard
  admin/                            approval queues and university directory
  account/                          favourites, saved searches, recent views, deletion
components/               76 components, grouped by domain
lib/
  data/                   the read boundary: listings, areas, universities, agents, forecast, stats
  supabase/               client, server, middleware, admin (service-role, allowlisted)
  i18n/                   config, server resolution, en/ms/ar dictionaries
  distance.ts             haversine campus proximity
  otp/  email/  maps/     phone verification, notifications, Maps URL resolution
supabase/migrations/      numbered SQL migrations
scripts/                  RLS harnesses, seeds, flow tests, the containment linter
tests/                    Playwright specs and page objects
Prediction Model/         the rent forecast: data, src, models, reports, api, tests
```

## Engineering docs in this repo

Written as if for a team, and useful for judging how I think:

- [`SCALING.md`](SCALING.md) — 10k to 1M user scaling audit: what breaks first, why, in what order to fix it, cost projections, exit paths, and what remains unverified
- [`features.md`](features.md) — the analytical backlog with reasoning: prioritisation, the data each feature needs, and the failure modes to watch for
- [`docs/reviews/`](docs/reviews) — quality reviews of the app and the university onboarding flow
- [`Prediction Model/rent-forecast/README.md`](Prediction%20Model/rent-forecast/README.md) — model card, methodology, and metrics
- [`Prediction Model/rent_prediction_model_plan.md`](Prediction%20Model/rent_prediction_model_plan.md) — the plan the model was built from

## Status and roadmap

Live and functional, seeded with representative inventory rather than real commercial listings. Known
gaps and the next planned work, in priority order:

1. **Report an agent** — a student-facing trust valve feeding an admin reports queue, completing the trust loop that verification only half closes
2. **Admin removal kill-switch** — retire an approved agent who turns bad: soft-delete, auto-archive their listings, revoke access, block licence reuse
3. **Rent price history capture** — the one prerequisite that cannot be backfilled, and the path from a proxy panel to a model trained on Nook's own realised prices
4. **Rate limiting and observability** — both identified in `SCALING.md` as required before real traffic, both still deferred

Reasoning for each, including the anti-fraud media-verification cluster (geotagged in-app capture,
perceptual-hash duplicate detection, continuous-take walkthroughs), is in [`features.md`](features.md).
