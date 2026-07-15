# University Accommodation Onboarding

Universities onboard to Nook as first-class listers of their own accommodation
(residential colleges, university-managed housing). Their listings carry a
distinct **"Listed by the university"** badge — a trust signal that the room is
offered by the campus itself, not a middleman.

**Key decisions**

- **Data model:** universities are a second `lister_type` on the existing
  `agents` table (`lister_type: 'agent' | 'university'` + `university_id` FK to
  `universities`). They reuse the agent dashboard, listing CRUD, RLS ownership
  (`current_agent_id()` is lister-type-agnostic), and the admin approval queue.
- **Verification:** admin manual outreach only. A Nook admin confirms the
  applicant by contacting the university through its **official published
  switchboard/website** — never the number in the application. No document
  upload, no email-domain check, no OTP.
- **One live account per university** (partial unique index): the account is
  the university's public identity; one switchboard call verifies it.

---

## Storyboard (10 frames)

A visual version of this storyboard exists as a shared artifact page.

### Act I — Apply

1. **Discovery** *(housing officer)* — A Universiti Malaya housing officer sees
   "Are you a university? List your official accommodation" (footer + cross-link
   on agent registration) → `/universities/register`.
2. **Application form** — Picks the university from Nook's official list, adds
   display name ("UM Student Accommodation Office"), a named contact person +
   role, the university's publicly verifiable phone/email, notes for the
   verification team, and login credentials. All validation — including the
   duplicate-university check — runs **before** the auth user is created.
3. **Submitted** — Pending page: "Under review" + copy explaining a Nook admin
   will contact the university through its official switchboard; no documents
   needed; typically 2–3 working days. Universities skip the agent
   licence/document/OTP stepper entirely.

### Act II — Verify

4. **Admin queue** *(Nook admin)* — The application appears in `/admin/agents`
   with a *University* type chip, contact person + role, applicant notes, and
   links to the editorial university record and the university's official
   website — the outreach starting point.
5. **Outreach call (off-platform)** — The admin dials the switchboard number
   published on the university's **own website**, reaches the housing office,
   and confirms the applicant is genuine and expected.
6. **Approve with a receipt** — The approve dialog requires a written outreach
   note ("Spoke to Puan Ainun, UM Housing Unit, via +60 3-7967 ···· on 15 Jul
   2026"). Approval stamps the account, stores the note as the audit trail, and
   emails the housing office.

### Act III — List

7. **First sign-in** — The officer lands on the standard dashboard; the account
   displays as the university itself. No licence chores anywhere.
8. **First listing** — Lists "Single room · 12th Residential College (KK12)"
   with photos, price, availability, and publishes.

### Act IV — Trust

9. **Student browsing** — The hall listing renders with the distinct
   "Listed by university" pill (different colour from the agent "Verified"
   badge) across search, map, home, and saved lists — in en/ms/ar.
10. **Trust moment** — The detail page shows "Listed by the university" plus
    "Verified by Nook through the university's official channels", linking to
    the university's lister profile. The student enquires with confidence.

**Design principles:** verify the institution, not paperwork · one account per
university · call the published number, never the applicant's · approval leaves
an auditable receipt · reuse the existing rails · the badge is the product.

---

## Implementation plan

### 1. Schema migration `0035_university_listers` (hosted Supabase SQL editor)

```sql
begin;
alter table public.agents
  add column lister_type text not null default 'agent'
    constraint agents_lister_type_chk check (lister_type in ('agent','university')),
  add column university_id uuid references public.universities(id),
  add column contact_person_name text,
  add column contact_person_role text,
  add column application_notes text,   -- applicant's note to admins
  add column verification_note text;   -- admin's "verified via outreach" note

-- university rows must link a university; agent rows must not
alter table public.agents add constraint agents_university_link_chk
  check ((lister_type = 'university') = (university_id is not null));

-- universities never carry a BOVAEP licence
alter table public.agents add constraint agents_university_no_licence_chk
  check (lister_type = 'agent' or bovaep_licence is null);

-- ONE live account per university; rejected/withdrawn can re-apply
create unique index agents_one_account_per_university
  on public.agents (university_id)
  where lister_type = 'university' and deleted_at is null and status <> 'rejected';

-- 0024-pattern column-INSERT grant (register action inserts an exact column list)
grant insert (lister_type, university_id, contact_person_name,
              contact_person_role, application_notes)
  on public.agents to authenticated;

-- recreate agents_public (0020) appending TWO safe columns; contact/notes stay private
create or replace view public.agents_public as
  select id, slug, name, agency, rating, review_count, response_time_mins,
         languages, avatar_url, whatsapp, phone, email, years_active, bio,
         bovaep_licence, lister_type, university_id
  from public.agents
  where status = 'approved' and deleted_at is null;
commit;
```

Plus a security-definer RPC `university_account_exists(p_university_id uuid)`
(mirrors `licence_exists`, migration 0034) with the same predicate as the
index, so registration can detect duplicates that RLS hides from anon —
checked **before** `auth.signUp`, failing closed on RPC error.

No RLS policy changes: `agents_insert_self_pending` covers the insert; listing
ownership via `current_agent_id()` is type-agnostic; admin decisions stay
service-role.

### 2. Types + row mappers

- `lib/types.ts`: `export type ListerType = "agent" | "university"`; on
  `Agent`: `listerType?: ListerType` (optional — `undefined` ⇒ agent, so seed
  fixtures don't retype), `universityId?`, plus self/admin-only
  `contactPersonName?`, `contactPersonRole?`, `applicationNotes?`,
  `verificationNote?`. Add helper `isUniversityLister(agent)`.
- `lib/data/_row-mappers.ts`: extend `AgentRow` (six columns) and
  `AgentPublicRow` (`lister_type`, `university_id`); map in `rowToAgent` **and**
  `rowToPublicAgent`; append to `AGENT_COLS` and `AGENT_PUBLIC_COLS` (kept in
  lockstep with the recreated view, per the existing comment contract).

### 3. Registration — `app/universities/register/`

New `page.tsx` + `actions.ts` + `components/auth/university-register-form.tsx`
(a sibling of `agent-register-form`, not a mode on it — that form is hardcoded
around agency/BOVAEP; reuse the same `auth-shell` CSS idioms).

- Form: university `<select>` from `getAllUniversities()` **raw records —
  submit the UUID `id`, not the slug** (`toSearchUniversities` remap trap);
  display name (prefill "{shortName} Student Accommodation Office"); contact
  person name + role; official phone; WhatsApp (NOT NULL in DB); official
  public email; notes textarea; login email + password + terms.
- `actions.ts` mirrors `signUpAgentAction` gate order — **all validation before
  `auth.signUp`** (no orphaned auth users): field shapes → university exists &
  live → `university_account_exists` duplicate gate (fail closed) → signUp →
  insert (`lister_type='university'`, `university_id`, `agency` = university
  name (see §6), status defaults to pending, slug via `deriveUniqueSlug`
  **extracted to `lib/data/unique-slug.ts`** since it is module-private in a
  "use server" file) → redirect to `/agents/pending`.
- Discovery links: cross-link on `app/agents/register/page.tsx` and a footer
  link in `components/nook/footer.tsx`.

### 4. Pending + verify pages — reuse with a university branch

- `app/agents/pending/page.tsx`: when `isUniversityLister` — skip the
  docs/consents fetch and the verify-status chips (they would render
  permanently "missing"); show "Under review" + outreach copy. University name
  from `agent.agency` (denormalized) — no extra query. Rejected branch
  (`statusReason`) works unchanged.
- `app/agents/verify/page.tsx`: `isUniversityLister` →
  `redirect("/agents/pending")` so universities cannot wander into the
  licence/OTP stepper.

### 5. Admin queue — extend `app/admin/agents/` (one queue)

- `_data.ts`: `AGENT_COLS` already picks up the new columns; add a helper
  resolving `university_id → { name, slug, website }`.
- `page.tsx`: "Type" column (Agent/University pill). University rows: contact
  person + role, official phone/email, `applicationNotes`, links to
  `/admin/universities/{slug}/edit` + the university **website**;
  completeness/doc columns render "—";
  `reviewReady = !!verificationSubmittedAt || listerType === "university"`.
- New `components/admin/approve-university-dialog.tsx` (clone of
  `reject-agent-dialog.tsx`) with a **required outreach-note textarea**.
- `actions.ts` (service-role boundary, lint-enforced): extend `decide()` —
  service-role read of `lister_type`; approving a university **requires a
  non-empty note** (mirror the rejection-reason gate), persisted to
  `verification_note`. Keep `revalidateTag("agents")` (busts the cached badge
  data).
- `lib/email/notifications.ts`: `listerType?` param + university-flavored
  approve/reject copy. `app/admin/page.tsx`: pending-universities count.

### 6. Dashboard reuse

- `dashboard/layout.tsx` keys purely on status — unchanged.
- **Denormalize `agents.agency` = university name at registration** → sidebar,
  card "Name · Agency" line, and profile hero display correctly with zero
  component changes. (Editorial renames won't auto-sync — accepted;
  `university_id` stays the source of truth for the badge.)
- `components/agents/listing-form.tsx`: no licence fields — no change required.

### 7. Badge — the student-visible highlight

Data flows automatically after §1+§2 (`ListingWithRelations.agent.listerType`).

- `app/globals.css`: `.pill-university` (+ `-mini`) — distinct info hue
  (`--accent-blue` family) vs the green `pill-verified`.
- `components/nook/listing-card.tsx` — four sites keyed on
  `agent?.status === "approved"` (homepage, map, default variants + the agent
  licence line): university listers **replace** the verified pill with
  `pill-university` + school icon + `c.universityListed`; the `bovaepVerified`
  line becomes `c.listedByUniversity`.
- `app/listings/[slug]/page.tsx` — three sites (hero pill, sidebar
  official-account label, trust list): "Listed by the university" + "Verified
  by Nook through the university's official channels"; the `bovaepNum` line
  self-hides (licence is null by constraint).
- i18n: every new key in **all three** dictionaries
  `lib/i18n/dictionaries/{en,ms,ar}.ts` (`card.*`, `listingDetail.*`, a new
  `universityAuth` section, `agents` pending copy, `admin` labels). Check RTL
  (`ar`) pill layout.

### 8. Public lister profile — reuse `app/agents/[slug]/page.tsx`

University rows get profiles on the same route (they are `agents_public` rows).
Branch on `isUniversityLister`: "Official university account" pill in the hero;
licence line self-hides; "View campus guide" link to `/universities/{slug}` via
`universityId`. Include universities in the `/agents` directory with the
university pill.

### 9. Verification / testing

- **RLS harness** `scripts/rls-test-university.mjs` (pattern:
  `rls-test-agentflow.mjs`): (a) authenticated insert with the new columns
  lands pending (catches a missing column grant — 42501 is runtime-only);
  (b) constraint violations fail; (c) a second account for the same university
  fails on the partial unique; (d) `agents_public` hides pending rows and
  exposes exactly `lister_type`/`university_id`, never contact/notes columns;
  (e) `university_account_exists` is anon-callable and matches the index
  predicate.
- **Playwright** `tests/e2e/agent/university-onboarding.spec.ts`: register →
  pending outreach copy (no verify chips) → admin approve with note →
  dashboard → create + publish listing → guest sees `pill-university` on card
  and "Listed by the university" on detail. Negative: duplicate application
  shows a form error.
- **Manual**: run the migration **before** deploying code (view/COLS lockstep,
  or every public agent read breaks); `node
  scripts/lint-service-role-containment.mjs`; spot-check all three locales;
  confirm approve busts the `agents` cache tag.

### Ordered file-change list

1. Supabase SQL `0035_university_listers` (incl. RPC) — SQL above
2. `lib/types.ts` — `ListerType`, Agent fields, `isUniversityLister`
3. `lib/data/_row-mappers.ts`
4. `lib/data/unique-slug.ts` (extract `deriveUniqueSlug`) + update
   `app/agents/register/actions.ts`
5. i18n dictionaries en/ms/ar
6. `app/universities/register/{page.tsx,actions.ts}` +
   `components/auth/university-register-form.tsx`
7. `app/agents/pending/page.tsx` (university branch) +
   `app/agents/verify/page.tsx` (redirect guard)
8. `app/admin/agents/{page.tsx,_data.ts,actions.ts}` +
   `components/admin/approve-university-dialog.tsx` +
   `lib/email/notifications.ts` + `app/admin/page.tsx`
9. `components/nook/listing-card.tsx`, `app/listings/[slug]/page.tsx`,
   `app/globals.css`
10. `app/agents/[slug]/page.tsx` + directory + footer/register cross-links
11. `scripts/rls-test-university.mjs`; Playwright spec

Sizing: one feature branch, ~15 files + 1 SQL migration.

### Risks / traps

- **View ↔ COLS lockstep**: shipping the new `AGENT_PUBLIC_COLS` before the
  view recreation breaks every public agent read — migration first, then
  deploy.
- **BOVAEP assumptions**: pending chips, admin doc columns, detail trust list,
  card licence line, profile hero — all enumerated above; the no-licence check
  constraint makes any missed spot render blank rather than lie.
- **Orphaned auth users**: any validation after `signUp` recreates the pre-0034
  orphan bug — the duplicate-university RPC check stays before signUp.
- **Slug remap trap**: the registration FK needs the UUID `id`;
  `toSearchUniversities` swaps in the slug — pass raw `UniversityRecord`s.
- **Column grant**: unlisted INSERT columns fail 42501 at runtime only — RLS
  harness case (a) exists to catch it.
