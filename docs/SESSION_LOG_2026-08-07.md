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

Replaced the flat V1 sidebar in `admin/layout.tsx` with a 6-group tree
(supersedes the never-adopted V2 `/admin2` preview, now doubly stale):

- **Contacts** (leaf)
- **Members** → Tasks, Marketplace
- **Operations** → Campaigns, Studio Members, Studio Invite, XQ
  Responses, RQ Responses
- **Admin** → Finance, Contracts
- **Marketing** → Outreach, Assets, Copy, Social Planner
- **Pages** → Pages, Alerts, Intro Requests, Approvals, GS Picks

Decisions folded in from Martin's clarifications: Tasks + Marketplace
under Members; Studio member list + invite under Operations;
Picks/Intro Requests/Approvals + Alerts under Pages. **Dashboard has no
explicit item** — the brand logo already links to `/admin` (flagged;
easy to add back).

- Each parent links to its first child; sidebar expands/highlights via
  path-prefix + query matching. Marketplace collapsed to a single leaf
  (page still supports ?view=pool|match internally).
- **Studio Invite** has no standalone route — the nav item links to
  `/admin/studio-members?invite=1` and `InviteMemberButton` now
  auto-opens the invite modal on that param, stripping it via
  `router.replace` so re-selecting re-triggers.
- Three new icons: `IconOperations` (gear), `IconAdmin` (shield),
  `IconPages` (document). Members reuses `IconMarketplace`.
- Verified live: all six groups + children render as specified, correct
  icons, invite modal auto-opens and URL param is cleared.

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
