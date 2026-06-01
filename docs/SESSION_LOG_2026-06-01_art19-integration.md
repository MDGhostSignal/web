# Session Log — 2026-06-01 (ART19 integration · Phases A/B/C/D)

Built the ART19 (Amazon-owned podcast hosting + ad platform)
integration end-to-end except for the listen-metrics pull, which is
blocked on ART19 Support confirming the analytics API surface. The
data layer, dashboard tab, admin home KPI, and end-to-end test
script all ship in this work; the placeholder card auto-swaps to a
real number the moment listens land.

## Discovery summary

- ART19 API base: `https://art19.com` (not `api.art19.com`, not
  `art19.com/api` — folder layout in docs is misleading)
- Auth: paired header `Authorization: Token token="<secret>",
  credential="<uuid>"`
- Both pieces issued by ART19 Support; a token alone returns HTTP 400
- Public OpenAPI specs live at
  `https://art19.com/swagger_json/{external,internal}/content.json`
- Resources confirmed: `/series`, `/episodes`, `/networks`, `/feeds`,
  `/genres`, `/languages`, `/classifications`, `/campaigns` (internal),
  `/agencies`, `/brands`, `/flights` (internal)
- **No listen / download / engagement endpoints in either scope.**
  Likely behind a partner/analytics scope that ART19 Support must
  enable. Support email drafted (see prior conversation; not commited
  to repo).

## Phase A — Foundation (commit `0fe0eea`)

### New
- `docs/ART19_SUPABASE_SCHEMA.sql` — five tables:
  `art19_network`, `art19_shows`, `art19_episodes`,
  `art19_listens_daily`, `art19_sync_runs`. RLS on with no policies
  (service-role-only access), same defense-in-depth pattern as
  Mercury.
- `apps/web/src/lib/art19-types.ts` — JSON:API envelope types
  (`JsonApiResource`, `JsonApiList`, `JsonApiSingle`), resource→row
  mappers (`networkRowFromResource`, `showRowFromResource`,
  `episodeRowFromResource`), helpers (`firstRelId`).
- `apps/web/src/lib/art19.ts` — REST client. Async-generator
  pagination via JSON:API `links.next`. Methods: `listAllSeries`,
  `listAllEpisodes`, `listAllNetworks`, `pingArt19`. Custom
  `Art19Error` carries upstream body for debugging.
- `apps/web/src/lib/art19-sync.ts` — `runArt19Sync()` orchestrator.
  Inserts `sync_runs` row up-front, upserts networks → shows →
  episodes (chunked to 200 rows per PostgREST POST), records counts
  on finish; full try/catch records error message on failure.
- `apps/web/src/app/api/admin/art19/sync/route.ts` — POST endpoint
  with dual auth (Bearer CRON_SECRET for the cron, admin cookie for
  the UI "Refresh now" button). Distinct status codes per failure
  shape: 503 (not configured), 502 (upstream broke), 401
  (unauthorized).
- `apps/web/scripts/probe-art19.mjs` — discovery script that
  confirmed the auth shape. Retained for re-probing once Support
  reissues credentials.
- `.github/workflows/art19-sync.yml` — daily cron at 04:00 UTC.
- `docs/ART19_INTEGRATION.md` — full runbook (env vars, auth quirks,
  troubleshooting, known gaps).

### Edited
- `apps/web/src/proxy.ts` — added `/api/admin/art19/sync` to
  `PUBLIC_SUBPATHS` so the cron can hit it.

## Phase B — Dashboard tab (commit `72d76cc`)

### New
- `apps/web/src/app/admin/art19/page.tsx` + `.module.css` —
  dedicated dashboard. KPI hero (Shows / Episodes / Network /
  Listens-30d-placeholder), sortable + searchable shows table,
  "Refresh now" button, status banner that distinguishes "not yet
  configured" from "errored" from "stale".
- `apps/web/src/app/api/admin/art19/summary/route.ts` — counts,
  latest sync, network names.
- `apps/web/src/app/api/admin/art19/shows/route.ts` — shows list
  joined with each show's latest-published-episode timestamp.
- `apps/web/src/app/api/admin/art19/episodes/route.ts` — paginated
  episode list, optional `show_id` filter.

### Edited
- `apps/web/src/components/admin/icons.tsx` — added `IconArt19`
  (microphone + broadcast waves).
- `apps/web/src/app/admin/layout.tsx` — sidebar entry under Finance.
- `apps/web/src/proxy.ts` — three read endpoints added to cookie-gate
  matcher.

## Phase C — Admin home KPI card (same commit `72d76cc`)

### Edited
- `apps/web/src/app/admin/page.tsx` — fourth `<HomeKpiCard>` for
  ART19. Initially headlines episode count; designed to swap to
  listen count once data lands.

## Phase D — Listens read endpoint + auto-swap + test script (this commit)

### New
- `apps/web/src/app/api/admin/art19/listens/route.ts` — GET listen
  aggregations. Accepts `?range=7d|30d|90d`. Returns
  `{ total, hasData, byShow, daily }`. Empty arrays / zero totals
  until `art19_listens_daily` populates. Stable response shape so
  the UI adopts it now and doesn't need to change when real data
  arrives.
- `apps/web/scripts/test-art19.mjs` — end-to-end smoke test
  modeled on `test-alerts.mjs`. Verifies schema, queries cache state,
  triggers prod sync via CRON_SECRET, confirms rows landed, and
  pings every read endpoint. Designed to be useful in three phases
  of the rollout (pre-creds, post-creds, post-listen-data).

### Edited
- `apps/web/src/app/admin/art19/page.tsx` — listens fetch added in
  parallel with summary/shows; placeholder card swaps to formatted
  total (`1.2M` / `845K` / `230`) when `hasData=true`.
- `apps/web/src/app/admin/page.tsx` — ART19 KPI card auto-swaps:
  when `hasData=true` the headline becomes listen count and the
  subtitle/body demote to "shows / episodes". When `hasData=false`
  it stays in placeholder mode (episode count headline, "pending
  ART19 metrics access" body).
- `apps/web/src/proxy.ts` — `/api/admin/art19/listens` added to the
  cookie-gate matcher.

## Validation

All three gates green at end of session (across all three commits):
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean

## What's wired but blocked

| Capability | Status | Unblocks when |
|---|---|---|
| ART19 → Supabase sync | Ready | Support sends valid token + credential ID |
| `/admin/art19` dashboard | Ready | Sync runs once |
| Admin home ART19 KPI | Ready | Sync runs once |
| Listens read endpoint | Ready | Listen data lands in `art19_listens_daily` |
| Listen-count KPI auto-swap | Ready | `art19_listens_daily` populated |
| Daily cron | Ready | Workflow secret `ART19_SYNC_URL` set (DONE by user) + credentials |

## Go-live (additive to what's already done)

User has already:
- ✓ Added `ART19_API_TOKEN` placeholder to `.env.local` (token alone, no credential)
- ✓ Added `ART19_API_CREDENTIAL_ID` placeholder (UUID guess)
- ✓ Added GitHub secret `ART19_SYNC_URL`
- ✓ Triggered the workflow once (failed as expected)

Outstanding:
- Apply `docs/ART19_SUPABASE_SCHEMA.sql` in Supabase SQL editor
- Wait for ART19 Support reply with the verified token + credential
  pair AND confirmation of which API scope exposes listen metrics
- Once Support replies: drop the real values into Vercel + redeploy,
  re-fire the workflow, run `node apps/web/scripts/test-art19.mjs`
  to verify
- Add a `populateListensDaily()` step to `runArt19Sync` against
  whatever scope/CSV/webhook Support confirms

## Memory updates

- Updated `project_admin_overview.md` — added `/admin/art19` to the
  surfaces list, noted the metrics-KPI placeholder pending Support.

## Open / next-step notes

- **Confidential docs still untracked** —
  `docs/Creator Life Cycle.xlsx`, `docs/XQ Draft.txt`,
  `docs/nimble_contacts.csv`. Flagged in earlier session logs; still
  no gitignore entry.
- **Per-show detail expand** on `/admin/art19` would be useful —
  click a row → see that show's recent episodes inline. Out of scope
  for today; the `/episodes?show_id=` endpoint is already in place
  for it.
- **Listens trend chart** — when real listen data arrives, a 30-day
  spark line on the dashboard would be more compelling than just a
  number. The `/listens` endpoint returns `daily[]` ready to feed a
  chart; just need to drop in a component.
