# Nook — Phase 3a: Auth + Account + User Persistence

This is the biggest phase yet. It introduces Supabase from scratch, four new database tables, the auth stack, four `/account` sub-pages, and wires three persistence flows (favourites, saved searches, recent views) into existing Phase 2 pages. Read this entire document before starting `/plan`.

**Phase status**: Phase 1 (foundation + homepage), Phase 2 (`/listings` + `/listings/[id]` + mobile parity), and the carry-over polish (navbar search pill + nav typography) are all shipped and approved. This phase builds on top of all of them.

**Out of scope for Phase 3a** (do not include, even if tempted):
- Migrating listings/agents/areas to Supabase (that's Phase 3b — listings stay as seed data in `lib/seed/*.ts`)
- Avatar upload (deferred to Phase 3.5 — use initials circle as placeholder)
- Google OAuth (skipped for now, email/password only)
- Agent-side anything (that's Phase 4)
- `/student-life` content pages (separate phase)

---

## Locked decisions (do not relitigate)

These were debated in conversation and resolved. Don't propose alternatives.

- **Auth method**: email + password only. No Google OAuth. Standard Supabase signup.
- **Email confirmation**: auto-confirm in development, email confirm in production. Use Supabase project settings for the env-specific switch — don't hardcode.
- **Session pattern**: `@supabase/ssr` package (the current Next.js 16 / 15 App Router pattern). **Do not use the deprecated `@supabase/auth-helpers-nextjs`.** If any documentation Claude Code finds references the old helper, ignore it.
- **Listings stay as seed data.** All queries in `lib/queries.ts` continue reading from `lib/seed/*.ts`. Only user-specific data goes in Supabase: `profiles`, `favourites`, `saved_searches`, `recent_views`.
- **Favourites — anonymous behaviour**: clicking heart while logged out is a **no-op + tooltip "Sign in to save."** Do not open a login modal. Do not redirect.
- **Avatar**: not in Phase 3a. `profiles.avatar_url` column exists in schema (nullable) for forward compatibility, but no upload UI. Render initials in a coloured circle as fallback.
- **Phone**: optional field at signup. Editable later in `/account` profile.
- **Gender preference**: optional dropdown at signup (Female-only / Male-only / Mixed). Editable in `/account` profile. When set and user is logged in, **auto-applied as a visible chip** in `/listings` filter bar with a × to dismiss for the session. Stripped from saved searches.
- **Listings without gender field set**: shown to everyone regardless of preference (permissive). This is a Phase 3a-only behaviour — Phase 4 will make gender required for agent listings.
- **`/account` layout**: sidebar nav (vertical rail desktop, top horizontal scroll on mobile). Sub-routes: `/account`, `/account/saved`, `/account/searches`, `/account/recent`.
- **`/login` and `/register` pages**: match the design pack mocks (`design-pack/login.html` and `design-pack/register.html` — verify exact filenames during checkpoint A audit).
- **`/account` sub-pages**: greenfield. Design from scratch using the existing visual idiom established by `/listings` and `/listings/[id]` — same spacing, typography, component vocabulary. Don't invent a new design system.
- **Recent views**: reuse `<ListingCard variant="horizontal">` with a "Viewed N days ago" timestamp added. Limit to last 20 unique listings per user.
- **Saved searches**: "Save this search" button on `/listings` next to the sort dropdown. Captures current URL params + a user-given name. Live result count, not stored.
- **Protected routes**: middleware-based auth check. Unauth users hitting `/account/*` redirect to `/login?redirect=/account/...`.

---

## Database schema (lock this carefully — RLS depends on it)

Four tables. Every column is intentional. Don't add fields "in case we need them later."

### `profiles`
Extends `auth.users` with app-level fields. One row per user, created via trigger on `auth.users` insert.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,                            -- denormalized from auth.users for query convenience
  phone text,                                     -- optional, E.164 format ideally
  country text,                                   -- ISO country code or full name, user-entered
  university_id text,                             -- references seed universities[].id, validated app-side
  gender_preference text check (gender_preference in ('female', 'male', 'mixed')),
  avatar_url text,                                -- nullable, populated in Phase 3.5
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `favourites`
One row per user-listing pair. Unique constraint prevents duplicates.

```sql
create table public.favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null,                       -- references seed listings[].id, validated app-side
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index favourites_user_id_idx on public.favourites(user_id);
```

### `saved_searches`
Named filter combinations.

```sql
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                             -- user-given, e.g., "Cheap rooms near UKM"
  query_params jsonb not null,                    -- serialized URL params, gender stripped
  created_at timestamptz not null default now()
);

create index saved_searches_user_id_idx on public.saved_searches(user_id);
```

### `recent_views`
Auto-tracked when a logged-in user visits `/listings/[id]`. Dedup via unique constraint + ON CONFLICT UPDATE.

```sql
create table public.recent_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null,
  viewed_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index recent_views_user_id_viewed_at_idx on public.recent_views(user_id, viewed_at desc);
```

Insert pattern:
```sql
insert into public.recent_views (user_id, listing_id)
values ($1, $2)
on conflict (user_id, listing_id)
do update set viewed_at = now();
```

### Trigger: profile auto-creation on signup

When a new user signs up, automatically create a `profiles` row. Display name comes from signup form metadata.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, phone, gender_preference)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'gender_preference'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

The signup form passes `phone`, `display_name`, and `gender_preference` via `options.data` to `supabase.auth.signUp()`. The trigger reads them from `raw_user_meta_data`.

---

## RLS policies (every policy must be reviewed — security depends on this)

Enable RLS on all four tables. **Without these, users can read each other's data.**

```sql
alter table public.profiles enable row level security;
alter table public.favourites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.recent_views enable row level security;
```

### `profiles` policies

```sql
-- Users can read their own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- No INSERT policy — profiles are created by the trigger, not by users directly
-- No DELETE policy — profile deletion happens via auth.users cascade
```

### `favourites` policies

```sql
create policy "favourites_select_own" on public.favourites
  for select using (auth.uid() = user_id);

create policy "favourites_insert_own" on public.favourites
  for insert with check (auth.uid() = user_id);

create policy "favourites_delete_own" on public.favourites
  for delete using (auth.uid() = user_id);

-- No UPDATE policy — favourites are immutable (toggle = insert or delete)
```

### `saved_searches` policies

```sql
create policy "saved_searches_select_own" on public.saved_searches
  for select using (auth.uid() = user_id);

create policy "saved_searches_insert_own" on public.saved_searches
  for insert with check (auth.uid() = user_id);

create policy "saved_searches_update_own" on public.saved_searches
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "saved_searches_delete_own" on public.saved_searches
  for delete using (auth.uid() = user_id);
```

### `recent_views` policies

```sql
create policy "recent_views_select_own" on public.recent_views
  for select using (auth.uid() = user_id);

create policy "recent_views_insert_own" on public.recent_views
  for insert with check (auth.uid() = user_id);

create policy "recent_views_update_own" on public.recent_views
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No DELETE policy in MVP — users can't manually clear recent views (could add later)
```

---

## Supabase setup (env vars + helper modules)

### Environment variables

`.env.local` (gitignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

The service role key is **not used in this phase** (no admin operations from the app). If Claude Code proposes adding `SUPABASE_SERVICE_ROLE_KEY`, push back — it's not needed for user-scoped reads/writes through RLS.

### Helper module structure

```
lib/supabase/
  ├── client.ts      — createBrowserClient for client components
  ├── server.ts      — createServerClient for server components/route handlers
  └── middleware.ts  — createServerClient variant for middleware
```

All three use `@supabase/ssr` per Next.js 16 patterns. **Do not write a single shared client.** Server and browser have different cookie-reading semantics; mixing them causes session leaks across users.

### Middleware

`middleware.ts` at project root. Refreshes session on every request, gates `/account/*` routes:

```typescript
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

Inside, refresh the session via Supabase SSR helpers. If `pathname.startsWith('/account')` and no session, redirect to `/login?redirect={pathname}`.

---

## Pages and components to build

### Auth pages

- **`/login`** — match `design-pack/login.html` (verify filename in audit). Form: email + password + submit. "Don't have an account? Register" link. Error display for bad credentials. On success: redirect to `?redirect=` param if present, else `/account`.
- **`/register`** — match `design-pack/register.html` (verify filename in audit). Form: email + password + display name + phone (optional) + gender preference (optional dropdown). Submit calls `supabase.auth.signUp()` with `options.data` carrying display_name/phone/gender_preference. On success: in dev (auto-confirm), redirect to `/account`; in production (email confirm required), show "Check your email to confirm" message.
- **Sign-out**: a button somewhere in the navbar dropdown when logged in. Calls `supabase.auth.signOut()` then redirects to `/`.

### Navbar updates

The navbar needs to reflect auth state:
- Logged out: "Login" and "Register" buttons (or links) on the right.
- Logged in: avatar circle (initials) with dropdown — "My Account", "Sign Out".

This requires the navbar to be aware of auth state. Use a server component fetching the user, or a client island that subscribes to auth changes. **Server-side fetch is simpler and avoids hydration flicker.** Pass user info down as a prop.

### `/account` shell

```
app/account/
  ├── layout.tsx          — sidebar shell, fetches user once for all sub-pages
  ├── page.tsx            — profile (default sub-page)
  ├── saved/page.tsx      — saved listings
  ├── searches/page.tsx   — saved searches
  └── recent/page.tsx     — recent views
```

Sidebar layout:
- Left rail (240px wide on desktop): user info at top (avatar circle + display name + email), then nav list (Profile / Saved listings / Saved searches / Recent views), with active highlight.
- Mobile (<768px): sidebar collapses to a top horizontal scroll of pill-tabs (same pattern as iOS Settings on a phone).
- Main content area renders the sub-page.

### `/account` (profile sub-page)

Form fields (editable):
- Display name (text)
- Phone (text, optional)
- Country (text or dropdown — text is simpler for MVP)
- University affiliation (dropdown from seed universities, optional)
- Gender preference (dropdown: Female-only / Male-only / Mixed / "Not set")

Read-only:
- Email
- Account created date

Save button (saves all fields at once). Toast confirmation on success. Sign out button at the bottom.

### `/account/saved`

Grid of `<ListingCard variant="horizontal">` for every favourite. Empty state: friendly message + CTA to `/listings`.

Each card has its heart already filled (since they're saved). Clicking the heart removes from favourites — same mutation as the `/listings` heart but pre-filled state.

### `/account/searches`

List of saved searches as rows:
- Name (user-given)
- Filter summary as chips (e.g., "UKM", "Under RM 600", "Bangi")
- Live result count (one query per row — fine, this is bounded by saved_searches count)
- Created date
- Actions: Run search (link to `/listings?...` with stored params), Edit name (inline rename or modal), Delete

Empty state: friendly message + instructions ("Save a search from the listings page by clicking 'Save this search' next to the sort dropdown").

### `/account/recent`

Same component as `/account/saved` but ordered by `viewed_at DESC`, limited to 20. Each card shows "Viewed N days ago" (or "Viewed today" / "Viewed yesterday").

Empty state: friendly message + CTA to `/listings`.

### Heart wiring on `<ListingCard>`

Currently the heart button doesn't toggle (confirmed broken/not-implemented). Wire it now.

- **Logged out**: clicking shows a tooltip "Sign in to save" (use a tooltip primitive — shadcn `<Tooltip>` if installed, otherwise hand-rolled with the same pattern as Phase 2's More-filters trigger). Tooltip auto-dismisses after 2-3 seconds. Heart visual state stays unchanged.
- **Logged in, not saved**: clicking inserts a `favourites` row. Optimistic UI: heart fills immediately, mutation runs in background. On error, revert and show toast.
- **Logged in, saved**: clicking deletes the `favourites` row. Optimistic UI: heart unfills immediately. On error, revert.

The card needs to know whether each listing is in the user's favourites. Options:
- **(a)** Pass a `Set<string>` of favourited listing IDs as a prop from the page (server fetches once, passes down).
- **(b)** Each card fetches its own favourite status (N queries — bad).

Pick **(a)**. Page-level fetch, prop-drill the set.

### Saved-search creation flow on `/listings`

Add a "Save this search" button next to the sort dropdown. Logged out → tooltip "Sign in to save searches" (same pattern as heart). Logged in → opens a small dialog/popover:
- Input: "Name this search" (suggested default based on active filters, e.g., "Rooms near UKM under RM 600")
- Save button → inserts `saved_searches` row with current URL params (gender stripped) + the name
- Cancel button

After save: toast confirmation, dialog closes. No redirect.

### Recent-views auto-tracking on `/listings/[id]`

When a logged-in user visits `/listings/[id]`, fire a server action (or API route) on page load that upserts a `recent_views` row. Logged-out users: no-op (silently skip).

Implementation note: do this in the page server component, after rendering decisions are made. Don't block the page render on the upsert — fire-and-forget pattern. If the upsert fails, the user shouldn't see anything (it's best-effort tracking).

### Gender preference chip on `/listings`

When user is logged in AND has `gender_preference` set AND not 'mixed':
- Server-side, append the gender filter to the query that produces listings.
- Render a chip in the filter bar (alongside other active-filter chips) that says e.g. "Female-only" with an × to dismiss.
- Dismissing × removes the filter for the session — implement as a URL param override: `?genderOverride=off`. When this is present, server-side gender filter is skipped. This way the override survives navigation within the listings page but resets on next session.
- The chip has a tooltip on hover: "From your profile preference. Edit in /account."

In `lib/listings-search.ts`, extend `getFilteredListings` to accept the user's gender preference + override state, applying the filter conditionally.

---

## Order of operations (8 checkpoints)

### Checkpoint A — pre-flight
- Audit codebase: read current `<Navbar>`, `<ListingCard>`, `lib/queries.ts`, `lib/listings-search.ts`. Confirm filenames `design-pack/login.html` and `design-pack/register.html` (or whatever they are).
- Install `@supabase/ssr` and `@supabase/supabase-js`.
- Create `lib/supabase/{client,server,middleware}.ts` helpers.
- Set up `.env.local` placeholders (Mohamed will fill in his Supabase project values).
- Document the Supabase project setup steps (create project, copy URL + anon key, run schema SQL, run RLS SQL, configure auth settings for auto-confirm in dev).
- **Ping for review.** Mohamed runs the SQL against his Supabase project, fills in env vars, confirms `tsc --noEmit` clean.

### Checkpoint B — auth pages + middleware
- Build `/login` and `/register` matching the design-pack mocks.
- Implement signup with `options.data` carrying display_name/phone/gender_preference.
- Implement login with redirect param handling.
- Implement middleware for session refresh + `/account/*` route gating.
- Update navbar to show login state (server-side fetch).
- Implement sign-out.
- **Ping.** Mohamed tests: signup → row appears in `profiles`, login persists across reload, logout clears session, hitting `/account` while logged out redirects to `/login?redirect=/account`.

### Checkpoint C — `/account` shell + profile sub-page
- Build `app/account/layout.tsx` with sidebar nav (desktop) and top scroll (mobile).
- Build `/account` (profile) with editable form fields.
- Wire profile update mutation.
- Initials circle for avatar (no upload).
- **Ping.** Mohamed tests: profile loads with current values, edits save and persist on reload, mobile layout works at 390px.

### Checkpoint D — heart wiring on `<ListingCard>`
- Wire heart click for logged-out (tooltip) and logged-in (toggle favourite) states.
- Add page-level favourites fetch on `/listings` and `/listings/[id]`, prop-drill the Set.
- Optimistic UI with error revert.
- **Ping.** Mohamed tests: heart works on `/listings` cards, on `/listings/[id]` button, persists across reload, anonymous tooltip shows correctly.

### Checkpoint E — `/account/saved` sub-page
- Build saved listings page reusing `<ListingCard variant="horizontal">`.
- Empty state with CTA.
- Heart unfill removes from this page (re-renders on next navigation).
- **Ping.**

### Checkpoint F — `/account/recent` + recent-views auto-tracking
- Implement upsert on `/listings/[id]` view (logged-in only, fire-and-forget).
- Build `/account/recent` page, ordered by `viewed_at DESC`, limit 20.
- Add "Viewed N days ago" timestamp to card.
- Empty state.
- **Ping.**

### Checkpoint G — saved searches: creation flow + `/account/searches` page
- "Save this search" button on `/listings` next to sort dropdown.
- Anonymous tooltip + logged-in dialog for naming + insert.
- Strip gender from saved query params before insert.
- Build `/account/searches` page with row layout (name, chips, live count, actions).
- Inline rename + delete actions.
- **Ping.**

### Checkpoint H — gender preference chip on `/listings`
- Extend `getFilteredListings` to accept gender preference + override state.
- Render chip when applicable, with × to dismiss (sets `?genderOverride=off`).
- Tooltip on hover.
- **Ping.** Final acceptance review.

---

## Acceptance gates (Phase 3a complete)

- All four tables created with correct schema and RLS enabled.
- All RLS policies verified — confirmed user A cannot read/write user B's data via SQL test.
- Signup creates auth user + profile row via trigger. Phone, display_name, gender preference correctly written from form metadata.
- Login persists session across reload. Logout clears it.
- `/account/*` routes protected — anonymous redirect to `/login?redirect=...`, returns to original after login.
- Profile editable, saves persist.
- Hearts work on all card surfaces. Anonymous tooltip displays. Logged-in toggles persist. Optimistic UI with revert on error.
- `/account/saved` lists favourites. Heart unfill removes from list.
- `/listings/[id]` view by logged-in user creates/updates `recent_views` row (verifiable in DB).
- `/account/recent` lists last 20 unique listings, newest first, with timestamps.
- "Save this search" works. `/account/searches` lists, allows rename/delete, "Run search" link works.
- Gender preference chip appears for logged-in users with preference set, dismissable via ×.
- Saved searches do not contain gender params.
- All pages work at 1280px and 390px.
- `tsc --noEmit` clean. `next build` green. Lint delta = 0 new errors.

---

## Key risks to flag in your plan

- **`@supabase/ssr` cookie handling in Next.js 16.** Server components cannot set cookies; only route handlers, server actions, and middleware can. Cookie-setting logic must live in middleware/actions. If Claude Code proposes setting cookies directly in a server component, that won't work in Next 16. Flag explicitly in the plan.
- **Middleware matcher pattern.** The matcher regex must exclude static assets but include all page routes. Get this right or every image request runs middleware (slow + breaks).
- **RLS testing.** It's easy to write RLS that *looks* right but fails on a corner case. The plan should include a manual test step at checkpoint A: create two test users in the Supabase dashboard, try to read user A's favourites while authenticated as user B (should fail). Confirm before building further.
- **Trigger function `security definer` + `set search_path`.** The trigger must run with the function owner's privileges (`security definer`) and have explicit search_path to avoid privilege escalation attacks. Both shown in the SQL above — confirm Claude Code copies them verbatim, doesn't strip them as "unnecessary."
- **Race condition on heart toggle.** If user clicks heart twice quickly while the first mutation is in flight, second click could insert a duplicate (caught by unique constraint, but causes an error toast). Debounce or disable button during mutation.
- **Server-side fetch for navbar auth state.** This makes every page server-rendered with auth context. Confirm this doesn't break any Phase 1/2 page that currently caches static. If a page is force-static, navbar will show stale auth state.
- **Forward note for Phase 3b**: when listings move to DB in 3b, the `gender` column should be `NOT NULL` (with default 'mixed' for migration of seed data lacking it). For Phase 3a, seed listings keep their current optional gender field.

---

## Workflow

Same as Phase 2:
1. Run `/plan` first. Audit codebase. Return plan with: file changes, schema, RLS policies (verbatim, not summarised), component tree, decisions to confirm, order of operations, acceptance gates, risks.
2. Wait for approval.
3. Implement in checkpoints A through H. **Ping at every checkpoint.**

This phase is large enough that the plan review will take time. Don't rush the plan — a thin plan means a long correction cycle later.
