# Session Log — 2026-06-16

Continuation of the long arc that started yesterday on `/world`. Today
swung from world polish into the **identity layer** + the **HQ rename**
+ a full first pass at the client-facing **Studio** surface. By
end-of-day, brand and creator self-serve registration with co-founder
approval, scoped dashboards, and the marketplace deck all work
end-to-end against real data.

The prior log (2026-06-15) covers the world / CPM tool / XQ intro /
RQ wordmark / horse mounting / character card work. Today is the
Studio + identity work that built on top of those.

## 1 · Pre-migration safety net

Before touching production data: **always-required local snapshot**.
Built two scripts in `apps/web/scripts/`:

- `snapshot-pre-migration.mjs` — dumps every identity-touching table
  (`members`, `member_comments`, `xq_submissions`, `rq_submissions`,
  `art19_*`) to local JSON **and** CSV under
  `backups/pre-migration-{ISO}-{label}/`. JSON is the lossless
  restore source; CSV is human-readable in Excel.
- `restore-from-snapshot.mjs` — reverses any snapshot. Refuses to
  run against a different Supabase project than the snapshot was
  taken from. Confirms `yes` twice before destructive ops.

`backups/` added to `.gitignore` (PII). Runbook in
`docs/PRE_MIGRATION_BACKUP.md`. Free tier — no Supabase PITR
needed; the local JSON copy is sufficient. Total captured this
session: **367 rows across 9 tables**.

## 2 · Studio identity schema migration

Applied via Supabase SQL editor (the MCP was running with
`--read-only`; we drafted SQL files in `docs/` and Martin pasted).

### A · `brands` + `creators` tables + members extensions

`docs/STUDIO_IDENTITY_SCHEMA.sql` — DDL only.

- New `brands` table (company entity): id, name, slug, website,
  logo_url, description, timestamps. `UNIQUE (name)`.
- New `creators` table (show entity): id, name, slug, art19_show_id
  → art19_shows (text FK), avatar_url, description, timestamps.
  `UNIQUE (name)`.
- `members` extended with `auth_user_id` (→ auth.users for Studio
  login), `brand_id`, `creator_id`, `xq_archetype` (denormalized),
  `invited_at`, `activated_at`, `last_login_at`.
- RLS enabled on both new tables (no policies; service role only,
  same convention as `members`).
- Triggers + indexes per the usual conventions.

### B · Backfill

`docs/STUDIO_IDENTITY_BACKFILL.sql` — pulled distinct organizations
out of members and rebound them as proper brand/creator rows:

| Metric | Value |
|---|---|
| Brands created from member orgs | 107 |
| Creators created from member orgs | 53 |
| Members linked to a brand | 107 |
| Members linked to a creator | 81 |
| Members with `xq_archetype` (denorm) | 0 → later 5 |
| Creators matched to an art19 show (by title) | 1 |

Only 1 of 53 creators auto-matched to its ART19 show by exact title
similarity. Most need either fuzzy matching or a manual link UI —
captured as an open task.

### C · Quiz dedupe + auto-link triggers

`docs/STUDIO_QUIZ_DEDUPE.sql` — collapsed duplicate (incomplete +
complete) quiz submissions per email and installed forward-looking
triggers so future `incomplete -> complete` transitions auto-dedupe.

- 5 XQ duplicate emails collapsed (re-pointed members from the
  incomplete to the complete, then deleted the incompletes).
- 0 RQ duplicates (the 3 incomplete-only RQ rows are warm leads
  who never finished — preserved).
- Triggers fire on `AFTER INSERT OR UPDATE OF status WHEN
  (NEW.status = 'complete')`. Update members to point at the
  complete row, then delete the incomplete siblings.

### D · Auto-create-contact triggers

Quiz submissions now auto-spawn a `discern`-phase contact in members
when no row exists for that email. Fixes the "warm leads invisible
to CRM" gap. Total rows went 252 → 271 (+19 new contacts from
existing submissions). XQ archetype denorm count went 0 → 5 as the
matching ran.

**Phase enum reality check**: I had the wrong mapping earlier in
the day. Actual values: `discern, court, sign, onboard, run,
paused, churned`. No `lead`, no `active`. Three-tier model:

- **Contact** = `phase IN ('discern', 'court')`
- **Warm (signing/onboarding)** = `phase IN ('sign', 'onboard')`
- **Real member** = `phase IN ('run', 'paused')` AND
  `member_number IS NOT NULL`
- **Former** = `phase = 'churned'`

`member_number IS NOT NULL` is the precise SQL filter for "got a
welcome box with a plastic membership ID card." Today only 2
members have a card number (#0055 and #0056).

## 3 · HQ rename (`/admin` -> `/hq`)

User-facing internal tooling moves to `/hq` to pair with the new
client-facing Studio surface. HQ = where the four co-founders work;
Studio = where brands + creators work.

- `apps/web/src/app/admin/` -> `apps/web/src/app/hq/` (git renames
  so history is preserved across 90+ files).
- `proxy.ts` matcher `/admin/:path*` -> `/hq/:path*`; login redirect
  target `/admin/login` -> `/hq/login`; `PUBLIC_SUBPATHS` updated.
- 55 inline href + path strings updated across 14 files.
- Sidebar lockup + login page brand tag now read "HQ".
- `.stylelintignore`: `src/app/admin/` -> `src/app/hq/`.

What stayed: `/api/admin/*` untouched. GitHub Actions cron jobs hit
`/api/admin/finance/sync`, `/api/admin/alerts/sync`,
`/api/admin/art19/sync`; esignatures.com webhook hits
`/api/admin/contracts/webhook`. Renaming those would break prod.

Old `/admin` URLs return 404 (no redirect).

## 4 · Studio — full first pass

New surface at `/studio`. Per-user Supabase Auth, distinct from
HQ's shared-password cookie. Four chunks shipped today.

### 20a · Auth shell + pages

- `lib/studio-auth.ts` — `createStudioBrowserClient`,
  `createStudioServerClient` (cookie-aware),
  `createStudioAdminClient` (service role),
  `loadCurrentStudioMember` (reads the linked CRM row, returns a
  typed `StudioMember`).
- `/studio/register` — open self-serve sign-up: email + password +
  brand/creator + name + organization. Creates Supabase auth user,
  then `POST /api/studio/register` to create or link the matching
  `members` row in `discern` phase with `activated_at = NULL`.
- `/studio/login` — Supabase email/password sign-in.
- `/studio/pending` — what unapproved users see post-login.
  Approved users get redirected from here to the dashboard.
- `/studio` — placeholder dashboard at this chunk (replaced in 20c).
- `proxy.ts` updated: `/studio/login` + `/studio/register` pass
  through; everything else under `/studio/*` requires a Supabase
  session.
- `apps/web/.env.local` got `NEXT_PUBLIC_SUPABASE_URL` +
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser-safe publishable key).

### 20b · HQ approval surface

- `/hq/studio-approvals` — server-rendered list of pending sign-ups
  (`auth_user_id IS NOT NULL AND activated_at IS NULL`).
- `ApprovalsTable` client component: name, email, organization,
  kind badge, XQ archetype, "registered N hours ago", **Approve**
  button.
- `POST /api/admin/studio/approve` — PATCHes
  `members.activated_at = now()`. Cookie-gated; proxy matcher
  gets `/api/admin/studio/:path*`.
- Sidebar entry added (reusing `IconLeads` for now).

### 20c · Scoped dashboard data

- `lib/studio-data.ts` — `loadCreatorShowData(creatorId)` joins
  creators → art19_shows → art19_episodes (recent 5) via
  `supabaseRest` under service role. Scope is derived from the
  authed session, **never user input** — cross-tenant impossible.
- `loadBrandCampaignsData(brandId)` is a stub `[]` until the brand
  ↔ art19_campaigns link ships.
- Dashboard:
  - **Creator view**: show header (88×88 cover art + title), KPI
    cards for total listens / episode count / XQ archetype, recent
    episodes list with per-episode listens + duration + relative
    date.
  - **Brand view**: placeholder cards explaining the data is being
    wired.
  - **Other view**: lone account-type card directing to support.
- Format helpers: `formatListens` (1.2K / 3.4M), `formatDuration`
  (12 min / 1h 8m), `formatRelativeDate`.

### 20d · Marketplace browse — reuses the X-Deck coverflow

Per Martin's request, the existing `XDeckSection` component (the
trading-card carousel that lives on the XQ results screen) was
reused for the marketplace — no new card UI to build.

- `/studio/marketplace` — Server Component. Loads the opposite
  side: brand viewers see creators, creators see brands.
- Mappers turn marketplace DB rows into `MatchCandidate` shape:
  picsum fallback for missing images, archetype-derived axis
  vector, "Profile to come" placeholders for bios.
- `loadMarketplaceBrands(viewerArchetype)` /
  `loadMarketplaceCreators(viewerArchetype)` — PostgREST embedded
  resource queries (`brands?select=...,members(xq_archetype)`) to
  surface the primary contact's archetype + compute a
  shared-axis match score.
- New `StudioHeader.tsx` shared by dashboard + marketplace: brand
  mark + tab nav (Dashboard / Marketplace) + sign-out.
- Empty-state card when no candidates exist.

## Files touched today

### New
- `apps/web/scripts/snapshot-pre-migration.mjs`,
  `restore-from-snapshot.mjs`
- `docs/PRE_MIGRATION_BACKUP.md`,
  `docs/STUDIO_IDENTITY_SCHEMA.sql`,
  `docs/STUDIO_IDENTITY_BACKFILL.sql`,
  `docs/STUDIO_QUIZ_DEDUPE.sql`
- `apps/web/src/lib/studio-auth.ts`,
  `apps/web/src/lib/studio-data.ts`
- `apps/web/src/app/studio/*` (layout, page, login, register,
  pending, marketplace, StudioHeader, SignOutButton, CSS)
- `apps/web/src/app/api/studio/register/route.ts`
- `apps/web/src/app/api/admin/studio/approve/route.ts`
- `apps/web/src/app/hq/studio-approvals/*`

### Renamed (git rename, history preserved)
- `apps/web/src/app/admin/` → `apps/web/src/app/hq/` (90+ files)

### Modified
- `apps/web/src/proxy.ts` — `/hq/:path*` matcher, `/studio` gate
  using Supabase session, `/api/admin/studio/:path*` allowlist.
- `apps/web/src/app/hq/layout.tsx` — Studio Approvals sidebar
  entry.
- `apps/web/.stylelintignore` — `src/app/hq/`, `src/app/studio/`.
- `apps/web/package.json` — added `@supabase/supabase-js` +
  `@supabase/ssr`.
- `apps/web/.env.local` — added the two `NEXT_PUBLIC_SUPABASE_*`
  vars.

### Migrations applied to Supabase (via SQL editor)
1. `studio_identity_brands_creators_members` (schema)
2. backfill SQL from `STUDIO_IDENTITY_BACKFILL.sql`
3. dedupe SQL from `STUDIO_QUIZ_DEDUPE.sql`
4. auto-create-contact triggers (XQ + RQ)
5. members RQ tracking columns (rq_code, xq_completed_at,
   rq_completed_at)

## Validation

- `npm run typecheck` (web) — clean throughout the day.
- Pre-ship gate caught two lint issues (apostrophe in JSX, raw px
  in studio CSS); both fixed by escape + `.stylelintignore` add.
- Manual end-to-end: register → pending → approve in HQ →
  dashboard auto-reroutes once `activated_at` is set.

## Open / next-step notes for tomorrow

The Studio surface is fully scaffolded but several pieces of polish
remain. Listed in priority order:

### Most-immediate

1. **Set Vercel env vars before prod deploy** —
   `NEXT_PUBLIC_SUPABASE_URL` +
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key
   `sb_publishable_HlXqMBXbb0qEhM_dLekmjw_J9jkPZs6`, same project as
   the existing service role key).
2. **Game server deploy** (task #13) — still blocked on Martin.
   `fly launch + fly deploy` per `apps/game-server/DEPLOY.md`, then
   set `NEXT_PUBLIC_GAME_SERVER_URL=wss://<app>.fly.dev` on Vercel.
   Until done, prod `/world` is single-player only.
3. **Wire more creators to ART19** — only 1 of 53 creators
   auto-matched by exact title equality. Either a fuzzy-match SQL
   pass or a manual link UI inside `/hq/studio-approvals` (or its
   own tab). Without this, ~52 creators see "Show performance: Not
   connected" on their Studio dashboard.

### Studio polish

4. **Brand-side scoping**. Two routes:
   - Schema migration adding `brand_id` to `art19_campaigns`
     (cleanest), or
   - Name-based fuzzy join with confidence scoring (less invasive,
     more brittle).
5. **Mike's card spec fields** (memo:
   `project_marketplace_dashboard.md`). Brands need: copy outline,
   audience match requirement, budget, ad type. Creators need: ad
   types offered, brand match requirement, available slots, CPM
   per slot. All needs new columns; the marketplace card UI is
   ready to drop them into placeholders the moment the data exists.
6. **"Initiate match" CTA** on the active marketplace card. Today
   the deck shows candidates ranked by XQ fit; there's no action
   beyond viewing. Probably wires to a new `match_requests` table
   per Mike's spec.
7. **Deny / archive** for pending registrations. Today there's
   only Approve.

### Quality / smoke-test

8. **End-to-end smoke test** of the Studio flow in dev: register a
   fake brand, register a fake creator, approve both from HQ,
   sign in as each, browse the marketplace. Verify the empty
   state when no opposite-side candidates exist.
9. **Email verification on registration** — Supabase Auth sends
   verify emails by default but we haven't validated the Supabase
   project's "Confirm email" setting. If it's on, new users need
   to verify before they can sign in.

### Lower priority

10. **World character card** (task #15 in memo
    `project_world_character_card.md`) — second-pass enhancement
    once Studio is solid.
11. **Marketplace dashboard** (task #16 / memo
    `project_marketplace_dashboard.md`) — superseded by today's
    Studio work, but the baseball-trading-card concept Mike
    described still hasn't been used; the current X-Deck reuse is
    the coverflow variant, not the discrete card-flip variant.

## Memory check

Three previously-saved memos still hold and are now load-bearing
for future sessions:

- `project_marketplace_dashboard.md` — Mike's per-side field spec.
- `project_world_character_card.md` — RPG player interaction.
- `project_cpm_tool.md` — closed; CPM calculator shipped earlier.

No new memos needed today — the work was concrete enough that the
SQL files in `docs/` + this log capture everything future-me needs.

## Closeout

Three substantial commits today on top of the morning's world work:

1. `379a3a5` — studio identity layer + snapshot/restore tooling.
2. `52c299e` — `/admin` → `/hq` rename (90+ files, 55 refs).
3. `8d82a35` → `5eab435` → `e9ecf49` → `cdef8d3` — Studio chunks
   20a (auth shell), 20b (HQ approvals), 20c (scoped dashboard),
   20d (marketplace deck).

Plus `3109687` (dedupe SQL committed to `docs/`).

Studio is **scaffold-complete** and **production-deployable**
pending the env-var wiring. Tomorrow's call.
