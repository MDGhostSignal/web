# Session Log — 2026-06-01 (Day overview)

Five discrete pieces of work landed today. The first four were kept
in a single commit at user request; the ART19 work shipped as two
follow-up commits later in the day. Each piece is independently
shippable. The CRM alerts system has its own deep-dive log at
`docs/SESSION_LOG_2026-06-01_crm-alerts-system.md`; this file is the
day-level overview.

## 1 · XQ quiz — per-field validation with inline error highlights

User report: hitting "Continue" / "Submit" with unfilled fields
showed only a generic banner; founders couldn't tell which field was
missing.

Reworked validation across all four `/xq-quiz` steps so each missing
input is highlighted in place + the banner reports a precise count.

### Changes
- **ContactStep** — per-field error map (`first`, `last`, `email`,
  `org`, `type`); red border + inline message under each invalid
  field; submit auto-scrolls + focuses the first invalid; errors
  clear per-field as soon as the user types.
- **Phase1Step + Phase2Step** — `Set<string>` of unanswered question
  ids; each unanswered card gets a red border + tinted background +
  inline "Please choose A or B" message; auto-scroll to first
  unanswered; picking an answer clears that card's red state.
- **Phase3Step** — now requires ≥1 selection per stress test
  (previously zero validation — you could click Generate with
  nothing picked); per-test invalid treatment + named banner
  ("Stress Test 01 needs at least one selection").
- **xq-quiz.css** — `.xq-err` upgraded from plain red text to a
  proper alert banner with `!` badge; new `.xq-field.invalid`,
  `.xq-field-error`, `.xq-q-block.invalid`, `.xq-q-block-error`
  classes.

### Files touched
- `apps/web/src/app/xq-quiz/ContactStep.tsx`
- `apps/web/src/app/xq-quiz/Phase1Step.tsx`
- `apps/web/src/app/xq-quiz/Phase2Step.tsx`
- `apps/web/src/app/xq-quiz/Phase3Step.tsx`
- `apps/web/src/app/xq-quiz/xq-quiz.css`

## 2 · "Index" → "Quotient" rebrand across all surfaces

User request: "It should never say `rq index` or `xq index`. It
should always say `quotient`, so `rq quotient` or `xq quotient`."

Audited every user-facing surface and renamed.

### Changes
- **Brand source of truth** — `BRAND.title` updated in
  `apps/web/src/lib/rq/constants.ts` ("Resonance Quotient") and
  `apps/web/src/lib/xq/constants.ts` ("The Conviction Quotient").
  Flows everywhere `BRAND.title` is consumed.
- **Public quizzes** — XQ layout meta title + description, XQ
  IntroStep (eyebrow, H1, body, CTA), RQ quiz contact step helper
  text + post-submit success banner, RQ results-screen body copy.
- **Email templates** — both `rq-submissions/emails.ts` (HTML body,
  plaintext body, subject line) and `xq-submissions/emails.ts`
  (HTML title, header, footer, incomplete-lead admin email).
- **Admin surfaces** — `/admin/xq-responses` page subtitle,
  `XQSummaryCard` tag (3 places), JSDoc on `members.ts` +
  `marketplace/PoolView.tsx` + `admin/contacts/page.tsx`.
- **Marketing seed** — 2 social-hook snippets in
  `scripts/seed-copy-snippets.mjs`.
- **External brand doc** — 5 occurrences in
  `apps/web/public/brand/WHITE_PAPER.md` (linked from the RQ intro
  screen).
- **Comments + identifiers** — internal JS/CSS comments updated for
  consistency (CSS file headers, scoring/constants doc comments,
  `.stylelintignore`, `test-email.mjs`).

### Intentionally left alone
Legacy pre-React preview files (`apps/web/rq_quiz/rqv1.txt`,
`apps/web/public/rq-preview.html`) still contain "Resonance Index"
deep in their code; they're historical artifacts not linked from
the live app.

## 3 · Admin/tasks — hide Completed from the "All" filter

User report: the "All" filter already excluded Archived; they wanted
the same treatment for Completed so the default overview stays
focused on active work.

### Changes
- **filteredTasks** — extended the existing archived-exclusion to
  also exclude `completed` when `filter === "all"`. Selecting the
  dedicated Completed or Archived filter still shows those tasks.
- **taskCounts.all** — count now reflects the same exclusion so the
  sidebar pill matches the rendered list.

### Files touched
- `apps/web/src/app/admin/tasks/page.tsx`

## 4 · CRM alerts + notifications system (4 phases)

The big piece of the day. User asked for an alert/notification
center for the membership pool + contacts: alert when a contact
hasn't been contacted in 4+ weeks (contacts) or when a marketplace
member has open lifecycle steps and hasn't moved in 1+ months. After
a research pass and UX recommendation, shipped the full system —
schema, detection cron, in-app bell + triage page, per-owner email
digest, and inline cues.

Full detail in
`docs/SESSION_LOG_2026-06-01_crm-alerts-system.md`. Top-line summary
here:

- **Phase A — Foundation**: `crm_alerts` table, detection logic,
  4 API routes (list / count / [id] / sync), hourly cron workflow
  `.github/workflows/crm-alerts-sync.yml`.
- **Phase B — In-app**: `<AlertsBell>` in the AdminShell top bar
  (60s polling + dropdown with Snooze/Resolve); `/admin/alerts`
  triage page with owner + kind filter pills; auto-resolve hooks
  on `POST /api/members/comments` (clears `contact_cold`) and
  `PATCH /api/members/[id]` (clears based on which fields changed).
- **Phase C — Email digest**: daily 08:00 UTC cron sends one
  grouped email per owner. Per-owner routing via
  `ALERT_EMAIL_<NAME_SLUG>` env vars; unowned alerts fall back to
  `ALERT_EMAIL_FALLBACK` (default `hello@ghostsignal.cloud`).
- **Phase D — Inline cues**: `<StaleBadge memberId={...} />` +
  `useAlertedMembers()` shared-cache hook in `@/components/admin`.
  Wired into PoolView's existing urgent banner as a minimal-touch
  example; drop in elsewhere as needed.

### Migration order (when going live)
1. Apply `docs/CRM_ALERTS_SCHEMA.sql` in Supabase SQL editor.
2. Set Vercel env vars: `ALERT_EMAIL_MIKE_SENSE`,
   `ALERT_EMAIL_JACK_W_HARDING`, `ALERT_EMAIL_MARTIN_DREXLER`,
   `ALERT_EMAIL_JEREMY_REEVES`, optionally `ALERT_EMAIL_FALLBACK`
   and `ALERT_CONTACT_COLD_DAYS` / `ALERT_MARKETPLACE_STALL_DAYS`.
3. Add GitHub Actions secrets: `CRM_ALERTS_SYNC_URL`,
   `CRM_ALERTS_DIGEST_URL` (CRON_SECRET already exists from Mercury).
4. `gh workflow run "CRM alerts sync"` to seed the table.
5. Verify at `/admin/alerts`.

## 5 · ART19 integration — credentials + comprehensive rewrite + ads dashboard

Two commits, started from a partially-broken Phase A and landed at a
fully working ads + revenue dashboard on production. Shipped as
`086754b` (sync rewrite) and `ee061cd` (ads dashboard).

### 5a · Credential setup

Bill at ART19 Support set up a paired credential (token + credential
UUID — both required in the Authorization header). User dropped them
into `apps/web/ART19TOKEN.txt`.

- Added `ART19TOKEN.txt` to `.gitignore` (raw credential drop, never
  commit).
- Wrote `ART19_API_TOKEN` + `ART19_API_CREDENTIAL_ID` into
  `apps/web/.env.local` and updated both on Vercel
  (Production + Preview) via the Vercel REST API.
- Auth verified live: `GET https://art19.com/networks` returned 200
  with the paired-token header.

### 5b · Discovery — the API doesn't match its own spec

First sync attempt returned `400 Bad Request on /networks?page[size]=50`.
Deep probing surfaced three behaviors that diverge from ART19's
documented JSON:API spec:

1. **Pagination requires Rails-style `page=N&per_page=M`** — the
   JSON:API `page[size]` form returns 400. The server's own
   `links.next` URLs use the broken JSON:API form, so following them
   fails too.
2. **Collection endpoints (`/series`, `/episodes`) ignore
   `filter[network_id]`** — the credential has *global* read across
   ART19's 685+ networks. To stay GhostSignal-scoped, you must walk
   relationship endpoints starting from a known network ID.
3. **`listen_count` IS exposed** on every level (network, series,
   episode) as an attribute. Phase A had assumed it required a
   separate metrics scope. Bonus: episodes also carry
   `downloads_first_24_hours`.

GhostSignal network UUID: `d40f1918-a60d-4eac-b1e7-55b357b3ce18`.

### 5c · Comprehensive sync rewrite (commit `086754b`)

Rewrote the REST client + sync orchestrator + types around the actual
API behavior. New required env var `ART19_NETWORK_ID` set on Vercel
and `.env.local`.

- **`art19.ts`** — relationship-walk client: `getNetwork`,
  `listSeriesRefsForNetwork`, `getSeries`,
  `listEpisodeRefsForSeries`, `getEpisode`, with manual `page=N`
  pagination.
- **`art19-sync.ts`** — orchestrator scoped to a single network via
  `ART19_NETWORK_ID`.
- **`art19-types.ts`** — added `listen_count`,
  `downloads_first_24_hours`; mapped `released_at` →
  `published_at`.
- **`/api/admin/art19/summary`** — returns `totalListens` (lifetime
  IABv2.2 download total) from the network record.
- **`/api/admin/art19/shows` + `/episodes`** — expose `listen_count`.
- **`/admin/art19` UI** — "Lifetime listens" KPI shows the real
  number now; "Listens · last 30d" stays as placeholder until the
  S3 daily export lands.
- **`docs/ART19_LISTENS_MIGRATION.sql`** — additive migration:
  `listen_count`, `slug`, `status`, `series_count`,
  `downloads_first_24_hours`.
- **`docs/ART19_INTEGRATION.md`** — runbook rewritten with the API
  quirks and the relationship-walk pattern.

**First good sync result:**
```
showCount: 3 · episodeCount: 58 · totalListens: 3,187
```

### 5d · Ads & Revenue dashboard (commit `ee061cd`)

User pivoted from generic "what's working" to ad-performance tracking
("how well the ads did and whether we can track that"). Probed
ART19's ad surface and found `/campaigns` + `/campaign_series` are
live. Built a full ad-performance UI.

- **`/campaign_series`** is the per-show, per-campaign join carrying
  CPM, spend, delivered impressions, brand approval, and feature
  flags (live reads / spots / RSS). The sync walks all records,
  filters to ones whose `series` relationship matches our synced
  shows, then fetches+upserts the distinct campaigns referenced.
- **Schema** (`docs/ART19_CAMPAIGNS_MIGRATION.sql`):
  - `art19_campaigns` — name, `ad_source` (external = programmatic,
    internal = direct), CPM, spend, impressions, fill_rate, dates.
  - `art19_campaign_series` — per-show join with all the
    revenue-relevant metrics.
- **`/api/admin/art19/campaigns`** — returns campaigns with per-show
  breakdowns + **network-scoped** KPI rollups. Critical: a
  campaign's top-level `current_spend` is **platform-wide** (across
  thousands of series on ART19). The endpoint computes
  `ourSpend` / `ourImpressions` by summing `campaign_series.current_spend`
  filtered to GhostSignal shows only — otherwise programmatic floor
  campaigns would inflate the numbers wildly.
- **UI** — new "Ads & Revenue" section below the shows table:
  4 KPIs (active count, scoped spend, blended eCPM, direct-sold
  share), expandable campaigns table with status/source filter
  chips and per-show drilldown.

**Sync result after campaigns wired in:**
```
showCount: 3 · episodeCount: 58 · campaignCount: 24
campaignSeriesCount: 24 · totalListens: 3,190
```

**Campaign mix verified in Supabase:** 9 active/direct · 9 active/
programmatic · 5 concluded/direct · 1 archived draft. *Unseriously*
has 1 active campaign delivering 1,104 impressions at $50 CPM.
Recent Progressive flights (Apr/May 2026) concluded with $0 spend —
likely ART19's billing reconciliation lag.

### 5e · Files touched

```
NEW  apps/web/src/app/api/admin/art19/campaigns/route.ts
NEW  docs/ART19_LISTENS_MIGRATION.sql
NEW  docs/ART19_CAMPAIGNS_MIGRATION.sql
MOD  apps/web/.env.local                                  (creds + ART19_NETWORK_ID)
MOD  apps/web/src/lib/art19.ts                            (full rewrite)
MOD  apps/web/src/lib/art19-sync.ts                       (full rewrite + campaigns)
MOD  apps/web/src/lib/art19-types.ts                      (listen_count + campaigns)
MOD  apps/web/src/app/admin/art19/page.tsx                (KPIs + ads section)
MOD  apps/web/src/app/admin/art19/page.module.css         (ads styling)
MOD  apps/web/src/app/api/admin/art19/summary/route.ts    (totalListens)
MOD  apps/web/src/app/api/admin/art19/shows/route.ts      (listen_count)
MOD  apps/web/src/app/api/admin/art19/episodes/route.ts   (listen_count)
MOD  apps/web/src/proxy.ts                                (campaigns allowlist)
MOD  docs/ART19_INTEGRATION.md                            (runbook rewrite)
MOD  .gitignore                                           (ART19TOKEN.txt)
```

Migrations applied in Supabase: `ART19_LISTENS_MIGRATION.sql` then
`ART19_CAMPAIGNS_MIGRATION.sql`. Vercel env vars added:
`ART19_API_TOKEN`, `ART19_API_CREDENTIAL_ID`, `ART19_NETWORK_ID`
(all Production + Preview).

### 5f · End-to-end verification

After the final deploy:
- `art19_network`: 1 row (GhostSignal · 3,190 lifetime listens · 3
  series · status active)
- `art19_shows`: 3 rows (Unseriously dominates with all the
  listens)
- `art19_episodes`: 58 rows
- `art19_campaigns`: 24 rows
- `art19_campaign_series`: 24 rows (all tied to GhostSignal series)
- `art19_sync_runs`: latest = `ok`, campaign_count=24,
  campaign_series_count=24
- Production endpoints: `/admin/art19` → 307 (auth gate working);
  all `/api/admin/art19/*` → 401 (correctly admin-gated, no 500s)
- Sync is idempotent (re-ran, identical counts, no duplicates)

## Validation

All gates green at end of session:
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean

## Memory updates

- `~/.claude/.../memory/project_admin_overview.md` — added
  `/admin/alerts` to the surface list; added `<AlertsBell>` +
  `<StaleBadge>` / `useAlertedMembers()` to the cross-page
  primitives section.
- `~/.claude/.../memory/reference_admin_infra.md` — listed the two
  new workflows (`crm-alerts-sync.yml`, `crm-alerts-digest.yml`)
  with their schedules + env requirements.
- `~/.claude/.../memory/user_role.md` *(new)* — Martin is a
  GhostSignal co-founder; revenue/ads is the operational lens.
- `~/.claude/.../memory/project_art19_priority.md` *(new)* —
  `/admin/art19` is the company's most strategic admin surface;
  expansion is ongoing.
- `~/.claude/.../memory/reference_art19_api.md` *(updated)* — full
  API quirks dump including campaigns + the spend-scoping caveat.
- `~/.claude/.../memory/feedback_verify_after_deploy.md` *(new)* —
  "are you sure?" = re-probe live state, not just trust API
  returns.

## Open / next-step notes

- **Confidential docs still untracked** —
  `docs/Creator Life Cycle.xlsx`, `docs/XQ Draft.txt`,
  `docs/nimble_contacts.csv` — flagged in prior session logs;
  still need a `.gitignore` entry. Not addressed today.
- **Contacts page deep `<StaleBadge>` integration** deferred — the
  contacts page is 2014 lines; the bell + `/admin/alerts` page
  already cover that surface. Drop `<StaleBadge memberId={c.id} />`
  next to contact names when there's appetite.
- **No "snooze until specific date" picker** — the API accepts
  `snooze_days` 1–30; UI exposes only the 7-day default. Easy to
  extend if founders ask.
- **ART19 S3 daily export** — Bill said "in hand, will follow up."
  When it arrives, populate `art19_listens_daily` and the "Listens
  · last 30d" KPI lights up. Unlocks daily/weekly revenue trends,
  eCPM trend, MoM growth, day-of-week heatmaps.
- **ART19 spend reconciliation lag** — Active campaigns deliver
  impressions but `current_spend=0`. Worth asking Bill about the
  billing lag so the UI can communicate "pending billing" vs
  "no revenue" distinctly.
- **ART19 brand / agency rollups** — campaigns carry `brand` and
  `agency` relationships we haven't surfaced. Could power a "top
  advertisers by spend" view.
- **ART19 distribution coverage** — series records carry
  subscription URLs (Apple, Spotify, etc.). Surfacing missing
  platform links as a "fix this" badge is a one-shot opportunity
  per gap.
