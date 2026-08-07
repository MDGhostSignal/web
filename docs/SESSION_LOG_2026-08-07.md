# Session Log — 2026-08-07

CRM/admin session. Four threads: email-alert scope, campaign-email
timing, a sidebar content-width bug, and a full navbar reorg (V3).

## 1. Email alerts restricted to contract renewals (+ campaign progress)

Team ask: disable all email alerts for now except contract renewal
reminders; keep the campaign-progress emails.

- New allowlist `DIGEST_EMAILABLE_KINDS = ["contract_expiring"]` in
  `api/admin/alerts/emails.ts` (flip-to-restore; add kinds back to
  resume emailing them). Documented that it gates the **digest email
  only** — detection (`lib/alerts.ts`) and the in-app bell +
  /admin/alerts dashboard still surface every kind (they read
  `crm_alerts` directly).
- `api/admin/alerts/digest/route.ts` now queries
  `&kind=in.(<allowlist>)` instead of `&kind=neq.campaign_ending`, and
  short-circuits (emails nothing) if the allowlist is empty. Net effect:
  marketplace_stall + task_stale no longer email; contact_cold was
  already paused; contract_expiring still routes to Mike + Jack.
- Campaign-progress email is a **separate path**
  (`campaign-alerts/sync` → `sendCampaignEndingEmail`) and was left
  firing — unaffected by the digest gate.

## 2. Campaign email now fires at 100% completion (was 97%)

- `CAMPAIGN_ENDING_RUN_PCT` 97 → **100** in `lib/campaign-alerts.ts`.
  The 7-day grace window already guarantees a daily cron won't step over
  the instant run-time hits 100% (== end_date).
- `buildCampaignSnapshot` now clamps `run_pct` at 100 (run time keeps
  climbing past end_date; "104% of run time" read as a bug).
- Copy aligned to completion: subject `Campaign complete · {name}`,
  eyebrow "Campaign complete", lede "…reached the end of its scheduled
  run — 100% of its run time elapsed"; text part likewise. In-app
  `ALERT_KIND_LABELS.campaign_ending` "Campaign wrapping up" → "Campaign
  complete".
- The send path (`sendCampaignEndingEmail` → Resend, Jack + Mike) is
  untouched — emails still go out.
- Verified with a Node type-strip boundary test (19/19): no fire <100%,
  fires exactly at 100% and through the grace, capped run_pct, no fire
  past grace / on archived_draft / missing dates, and email copy.

## 3. Sidebar collapse/expand content-width bug

Report: content sometimes stays too narrow after toggling the sidebar.

- Isolated Playwright repro of the exact shell CSS reflowed correctly
  (1184↔1376 at 1440px), proving the shell math is sound and that
  `width: 100%` on `.content` is inert under `flex: 1`.
- Root-cause candidate: `.content` carried `flex: 1` **and**
  `width: 100%` **and** `margin-left: var(--admin-sidebar-width)`. The
  `width: 100%` is redundant (flex-basis wins) but, in any engine that
  honors it, resolves against the full row while margin-left also
  offsets it → box pushed past the viewport / stale narrow width.
  Removed it (`AdminShell.module.css`), with a comment explaining why.
- Verified on the **real** admin: content width alternates cleanly
  1169 (expanded, margin 256) ↔ 1361 (collapsed, margin 64) across 6
  Ctrl+B toggles, both directions, zero viewport overflow.

## 4. Navigation V3 — task-clustered hierarchy (live)

Replaced the flat V1 sidebar in `admin/layout.tsx` with a task-clustered
tree (supersedes the never-adopted V2 `/admin2` preview, now doubly
stale). **Final shape** after several live refinements from Martin:

- **Dashboard** (leaf → /admin)
- **Contacts** (leaf)
- **Members** = the marketplace → Pool, Match
- **Tasks** (leaf, its own top-level item after Members)
- **Operations** → Campaigns, Studio Members, XQ Responses, RQ Responses
- **Admin** → Finance, Contracts
- **Marketing** → Outreach, Assets, Copy, Social Planner
- **Pages** → Pages, Approvals, GS Picks

- Each parent links to its first child; sidebar expands/highlights via
  path-prefix + query matching.
- Three new icons: `IconOperations` (gear), `IconAdmin` (shield),
  `IconPages` (document). Members uses `IconMarketplace`; Dashboard
  `IconDashboard`, Tasks `IconTasks`.
- **AdminSidebar fix:** a leaf item now only highlights on an exact
  route match, never as an "ancestor" — Dashboard's `/admin` href is a
  path-prefix of every admin route and would otherwise section-tint the
  whole tree. `parentIsAncestor` gated on `item.children`.
- Iterated shape (all live-verified via Playwright): first pass had
  Members = Tasks+Marketplace, Operations with a "Studio Invite" item
  (opened the modal via ?invite=1), and Pages with Alerts + Intro
  Requests. Martin then: made Dashboard the first item, moved Tasks to
  its own top-level slot, set Members = marketplace (Pool/Match),
  removed Studio Invite (there's an invite button inside the members
  list — the ?invite=1 auto-open in InviteMemberButton was reverted),
  and dropped Alerts + Intro Requests from Pages (Alerts still has its
  topbar bell). Routes for all dropped items still exist by URL.

## 5. Dashboard tiles — investigation only (NOT built this commit)

Ask: add "Total Cash" (combine the two checking accounts) + "Last 30
days network listens". Investigated the live data before building:

- **Total Cash already exists.** The /admin dashboard "Total cash" card
  sums `available_balance` across all `mercury_accounts`, so it already
  combines both checking accounts. Live accounts: Checking ••8423
  ($136.96), Checking ••8706 ($0.00, added today), Savings ••4553
  ($0.00). Current total = $136.96. Possible refinement: relabel/split
  the tile to name the two checking accounts explicitly (payouts vs
  operating) rather than "across 3 accounts".
- **Last-30-day network listens is blocked on data.** The ART19 card
  already has a `listens · last 30 days` slot wired to
  `/api/admin/art19/listens?range=30d`, but `art19_listens_daily` has
  **0 rows** (hasData=false → "pending ART19 metrics access"). Episodes
  carry only cumulative `listen_count` + `downloads_first_24_hours` — no
  daily time-series — so a true trailing-30-day network figure can't be
  computed until the daily-listens pipeline is populated (pending ART19
  metrics API access per docs/ART19_INTEGRATION.md). The tile lights up
  automatically once rows land.

Not started pending Martin's call on the two points above.

## 6. Nav V3 — further trims (uncommitted)

- **Members** and **Pages** collapsed from single-child dropdowns to
  plain leaf links (Members → /admin/marketplace, Pages → /admin/pages)
  after Match / Approvals / GS Picks were removed. Final top nav:
  Dashboard · Contacts · Members · Tasks · Operations · Admin · Marketing
  · Pages.

## 7. Contact reach-out lifecycle → 6 stages (uncommitted)

Reshaped the Contacts derived-status model (no DB enum migration —
`phase` stays a Postgres enum; the lifecycle is derived from Member
fields). New stages: First reach out · 2nd reach out · Heard back — no ·
Heard back — interested · Agreements sent · Signed up as member, plus
off-pipeline Not started / Stopped.

- `ContactLifecycleStepper.tsx`: new `DerivedStatus` set +
  `deriveStatus` mapping (became_member/run → member; phase sign →
  agreements-sent; response_kind → heard-no/interested;
  lifecycle_steps.second_reachout → 2nd reach out; else first/untouched),
  6-circle stepper, `LIFECYCLE_RANK` export.
- `page.tsx`: `statusToPatch` rewritten for the 6 stages; Status filter
  auto-updates (driven by DERIVED_STATUSES); **new Lifecycle-column sort**
  by `LIFECYCLE_RANK` (toggle to descending = closest to signed-up first).
- **1st/2nd reach-out** is the one new bit of state — stored in the
  free-form `lifecycle_steps` jsonb (`first_reachout` / `second_reachout`).
  These are NOT catalog steps; registered via new
  `CONTACT_STEPPER_STEP_KEYS` and allowlisted in the members API's
  `sanitizeLifecycleSteps` so they survive writes (the sanitizer drops
  unknown keys — would otherwise have silently stripped them).
- Verified live: filter shows all 8 options, stepper renders 6 circles,
  Lifecycle column sortable.

## 8. Marketplace lifecycle → 5 onboarding steps (uncommitted)

Replaced the 10-step Sign+Onboard+Run marketplace slice with 5 Onboard
steps (Martin's spec, in order): Welcome Box Sent · Studio Invite Sent ·
Mercury / Tax Sent · Studio Profile Completed · Mercury / Tax Completed.

- `lib/members.ts`: LIFECYCLE_STEPS marketplace slice swapped; Mercury /
  Tax steps are `creatorOnly` (brands don't receive payouts → N/A).
  Discern + Court checkpoints kept for the Contacts lead-stage checklist.
- `marketplace/LifecycleStepper.tsx`: removed the dead xq_completed
  auto-derive; phase header/label hidden when there's a single phase
  group (all 5 are Onboard → flat 5-step row).
- Verified live: stepper shows exactly the 5 labels, no phase header.

## 9. Organization column on Members + Contacts lists

- Added an **Organization** column to the marketplace (Members) pool list
  and ordered it **first, before Name** on both the Members list and the
  Contacts list (Martin's call).
- `MarketplaceEntity` (marketplace-mocks.ts) + `MarketplaceLite`
  (members.ts) gained an optional `organization`; `memberToMarketplaceEntity`
  populates it from `m.organization` (seed mocks leave it undefined → "—").
- PoolView: new truncate column; contacts/page.tsx: moved the existing
  Organization column ahead of Name.
- Verified live: both header rows read Organization → Name → …

### Members (marketplace) list — sortable columns

- Added `sort` to the marketplace pool's **Organization**, **Name**, and
  **Lifecycle** columns (previously the pool table had no sortable
  columns). Organization/Name are string sorts (empty orgs park at the
  bottom on asc); Lifecycle sorts by onboarding progress.
- New `countMarketplaceCompleted(steps, memberType)` in members.ts —
  {done,total} over the marketplace onboarding slice only (excludes N/A
  creator-only steps), matching what the compact stepper shows. PoolView
  builds a `memberById` map + a `lifecycleRank` fraction (mocks with no
  member sort to the bottom).
- Organization also added to the pool search filter.
- Verified live: ↕ on all three headers; Name asc/desc + Organization
  asc reorder the rows correctly.

## 10. Notebook page (To Do & Plan subnav) — dynamic tabbed pages

New `/admin/tasks/notebook` — a plain-text scratch notebook. The "Tasks"
top-level nav item became a parent (children: Tasks + Notebook) and was
**renamed "To Do & Plan"**. Full-viewport editor with Google-Sheets-style
bottom tabs: switch pages, **+ to add**, double-click to rename, × to
delete. Bodies autosave (debounced 800ms; flushed on tab switch + page
hide). Seeds with two pages (Business plan / Notes).

- `api/admin/notebook/route.ts`: GET list (ordered by position), POST
  create (append at max position + 1), PUT update title/body, DELETE by
  id. Tolerant of a missing table (`tableMissing` flag → setup hint;
  writes 503). **Gotcha fixed:** PostgREST reports a missing table as
  `PGRST205` / "Could not find the table … in the schema cache", NOT raw
  `42P01` — the check covers both.
- Storage: `docs/NOTEBOOK_SUPABASE_SCHEMA.sql` (notebook_docs; uuid id,
  title, body, position). **NOT yet run** — Supabase MCP is read-only, so
  Martin must run it; until then the page shows the setup hint, the +
  button is disabled, and edits don't persist. (Started as two fixed
  slugs; revised to dynamic pages before the table was ever created, so
  no migration churn.)
- proxy.ts: `/api/admin/notebook` added to the matcher (cookie gate).
- Verified live (pre-table): nav parent + Notebook child, full-size
  editor, setup hint + disabled + while the table is absent.

## 11. Dashboard motivational banner

`DashboardHero` at the top of `/admin` — the GHOSTSignal vertical cloud
brandmark (theme-aware white/dark swap, same idiom as the topbar), the
line **"You are making the World."**, and a morse strip beneath that
encodes the same phrase (self-contained dot/dash renderer, amber accent).
Purely decorative; sits above the existing Dashboard header + KPI grid.
Verified live (quote + 52 morse symbols render in a tidy band).

## 12. Follow-ups: sidebar refresh-gap, notebook default + delete modal

- **Sidebar refresh gap (real fix).** Removing `width:100%` earlier didn't
  cover the reported case: on **refresh with a collapsed preference**, the
  sidebar renders 64px but the shell's `data-sidebar-collapsed` stayed at
  the SSR value `"false"`, so the content margin stayed 256px → a
  persistent 192px gap. Root cause: `collapsed` flips via render-phase
  setState during hydration and, with the Suspense-wrapped sidebar, React
  left that attribute on the shell div unpatched. Fix: an effect
  imperatively syncs `data-sidebar-collapsed` to state via a ref
  (`AdminShell.tsx`). Verified: gap=0 on collapsed AND expanded refresh,
  both directions.
- **Notebook is now the default page** under "To Do & Plan" (parent →
  /admin/tasks/notebook; children Notebook then Tasks). Added an `exact`
  flag to `AdminNavSubItem` (`AdminSidebar.tsx`) so the Tasks row
  (`/admin/tasks`, a path-prefix of the notebook route) doesn't also
  highlight on the Notebook page. Verified live.
- **Notebook delete confirmation** switched from `window.confirm` to the
  GhostSignal admin `Modal` (Cancel + destructiveSolid "Delete page").

## 13. Dashboard banner — animated 3D mesh background

Reworked the motivational banner from a plain outlined container into a
self-contained dark "signal field" panel with an **animated 3D wireframe
mesh** rippling in perspective (hand-rolled canvas — a grid of vertices
displaced by travelling sine waves, cheap perspective projection, glowing
near→far blue→violet segments). DPR-aware, ResizeObserver-fit,
prefers-reduced-motion renders one still frame. Brandmark + quote + morse
float above on a vignette scrim; morse glows. `DashboardHero` is now a
client component; always-dark so it reads the same in both admin themes.
Verified live (frame screenshot).

## 14. Dashboard banner — Renaissance gilded-fresco redesign

Reworked the banner again (Martin's call) from the 3D mesh to a
Renaissance / Michelangelo-inspired **gilded fresco**, theme "admiration
of beauty and craft": a deep warm bronze ground lit by divine light, slow
rotating god-rays (CSS conic-gradient, masked), drifting gold dust motes
(canvas, additive `lighter` blend, upward drift + twinkle; reduced-motion
= still scatter), the white brandmark haloed in gold, and "You are making
the World." in a gilded italic serif (brushed-gold `background-clip:text`
gradient). Morse recolored to gold. Still a self-contained warm/dark panel
(theme-independent). Verified live (frame screenshot).

## Files touched

- `src/app/api/admin/alerts/emails.ts`, `alerts/digest/route.ts`
- `src/lib/campaign-alerts.ts`, `src/lib/alerts.ts`
- `src/components/admin/AdminShell.module.css`, `icons.tsx`
- `src/app/admin/layout.tsx`
- `src/app/admin/studio-members/InviteMemberButton.tsx`

## Validation

- `npm run typecheck` — pass.
- `npm run lint` — 0 errors (5 pre-existing warnings in world/studio).
- `npm run lint:css` — clean.
- Live Playwright verification of nav tree, invite modal, and width
  reflow (dev server on :3000, admin cookie signed from ADMIN_AUTH_SECRET).

## Open notes / next steps

- Committed + pushed to main (dev server left running on :3000 for
  inspection).
- **Dashboard tiles** (section 5) still to build — awaiting Martin on
  the Total Cash relabel and the blocked listens metric.
- `/admin2` V2 preview is now stale twice over (V3 is live). Candidate
  for deletion + removing its proxy.ts matcher + .stylelintignore line.
- Dashboard has no nav item (logo-only access) — add a top-level entry
  if the team wants it.
- Studio Invite → `?invite=1` also strips the param on open; the nav row
  highlights Studio Members after open (invite is a modal over that page).
