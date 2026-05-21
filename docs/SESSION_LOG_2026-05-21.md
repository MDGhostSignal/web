# Session Log — 2026-05-21

## Summary

Shipped the `/admin/finance` tab end-to-end: Mercury Bank API client → Supabase cache → 15-min Vercel Cron sync → dashboard UI with KPI hero, per-account cards with 7-day sparklines, recent transactions table with transaction detail modal, and a 90-day cash-position trend chart. Read-only against Mercury. Sandbox-first config, swappable to production via env var.

Plan: `C:\Users\heyma\.claude\plans\abstract-spinning-stallman.md`.

## Changes implemented

### Phase A — Sync infrastructure
- Mercury typed REST client (`listAccounts`, `listAccountTransactions`, `MercuryError`).
- Sync orchestrator: pulls accounts + 90 days of transactions per account (paginated 500 × 5 cap), upserts via PostgREST `on_conflict=id`, writes a `mercury_sync_runs` row for observability. Idempotent.
- Dual-auth `POST /api/admin/finance/sync`: accepts either `Bearer ${CRON_SECRET}` (Vercel Cron path) or the `admin_auth` cookie (Refresh-now button path).
- Currency contract enforced: `numeric(20,4)` in Postgres, strings on the wire, bigint cents in JS. `parseAmountCents` / `formatCents` / `sumAmountsCents` helpers in `mercury-types.ts`. No `Number(amount)` anywhere in the integration.

### Phase B — Dashboard UI
- Finance tab added to admin layout (`{ href: "/admin/finance", label: "Finance" }`).
- `GET /api/admin/finance/accounts` + `GET /api/admin/finance/transactions?limit=&offset=&accountId=&since=` (PostgREST under the hood).
- Dashboard composition: `PageHeader` (with refresh + last-synced pill), `StaleBanner` for failed/old syncs, `KpiRow` (Total cash · 30-day net flow · Runway days), per-account cards with masked account numbers (`••••1234`), `TransactionsTable` (wraps shared `DataTable`), `TransactionDetail` modal.
- Inflows tinted with `--admin-success`, outflows neutral — no red/green binary. Pending = warn badge; failed = danger badge.

### Phase C — Charts + polish
- `recharts@^3.0.0` installed (React 19-native peer deps — v2 would have needed `--legacy-peer-deps`).
- `GET /api/admin/finance/trend?days=90` aggregates a daily total-cash series + per-account 7-day series server-side from cached transactions.
- `CashTrendChart`: Recharts `AreaChart`, themed via `--admin-*` tokens (accent fill gradient, muted axis ticks, dashed grid), compact $K/$M Y-axis ticks, bigint-safe tooltip labels.
- `AccountSparkline` inside each account card: 7-day mini area chart tinted green when trending up, muted when flat/down.

### Proxy + cron + docs
- `apps/web/src/proxy.ts`: `/api/admin/finance/sync` added to `PUBLIC_SUBPATHS` (route enforces bearer/cookie auth internally); `/accounts`, `/transactions`, `/trend` added to the matcher.
- `apps/web/vercel.json` created (`*/15 * * * *` cron pointing at `/api/admin/finance/sync`).
- `docs/MERCURY_INTEGRATION.md` runbook: env var matrix, sandbox→prod swap, token rotation, monitoring, failure recovery.
- `docs/MERCURY_SUPABASE_SCHEMA.sql`: `mercury_accounts`, `mercury_transactions`, `mercury_sync_runs` + indices.

## Files touched

### New
- `apps/web/src/lib/mercury-types.ts`
- `apps/web/src/lib/mercury.ts`
- `apps/web/src/lib/mercury-sync.ts`
- `apps/web/src/app/api/admin/finance/sync/route.ts`
- `apps/web/src/app/api/admin/finance/accounts/route.ts`
- `apps/web/src/app/api/admin/finance/transactions/route.ts`
- `apps/web/src/app/api/admin/finance/trend/route.ts`
- `apps/web/src/app/admin/finance/page.tsx`
- `apps/web/src/app/admin/finance/finance.module.css`
- `apps/web/src/app/admin/finance/components/KpiCard.tsx`
- `apps/web/src/app/admin/finance/components/KpiRow.tsx`
- `apps/web/src/app/admin/finance/components/AccountCard.tsx`
- `apps/web/src/app/admin/finance/components/AccountSparkline.tsx`
- `apps/web/src/app/admin/finance/components/CashTrendChart.tsx`
- `apps/web/src/app/admin/finance/components/TransactionsTable.tsx`
- `apps/web/src/app/admin/finance/components/TransactionDetail.tsx`
- `apps/web/src/app/admin/finance/components/RefreshButton.tsx`
- `apps/web/src/app/admin/finance/components/StaleBanner.tsx`
- `apps/web/vercel.json`
- `docs/MERCURY_INTEGRATION.md`
- `docs/MERCURY_SUPABASE_SCHEMA.sql`

### Edited
- `apps/web/src/app/admin/layout.tsx` — added Finance tab
- `apps/web/src/proxy.ts` — `PUBLIC_SUBPATHS` allowlist for the sync POST + matcher entries for the three read endpoints
- `apps/web/package.json` — added `recharts@^3.0.0`

## Validation results

All AGENTS.md gates green:
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean
- `npm run assets:audit` — `OK: 51 referenced public assets exist.`
- `npm run build` — clean. `/admin/finance` and four `/api/admin/finance/*` routes registered.

## Outstanding actions for the user

1. **Apply the Supabase schema.** Run `docs/MERCURY_SUPABASE_SCHEMA.sql` in the Supabase SQL editor.
2. **Set env vars** (`.env.local` for dev, Vercel Project Settings for deploys):
   - `MERCURY_API_TOKEN` — sandbox token from `api-sandbox.mercury.com` → Settings → API Tokens (select **Read Only**).
   - `MERCURY_API_BASE_URL` — `https://api-sandbox.mercury.com/api/v1` for sandbox; `https://api.mercury.com/api/v1` for prod.
   - `CRON_SECRET` — `openssl rand -hex 32`. Also set in Vercel Project Settings → Cron Secret so Vercel Cron sends matching `Authorization: Bearer`.
3. **Smoke-test the sync** locally with `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/admin/finance/sync`. Expect `{ "ok": true, "accountCount": N, "transactionCount": N }`.
4. **Visit `/admin/finance`** to see the dashboard against sandbox data. Toggle dark/light. Test "Refresh now."
5. Once validated, **swap to production** by flipping `MERCURY_API_TOKEN` + `MERCURY_API_BASE_URL` in Vercel and redeploying.

## Open issues / next-step notes

- **Out of scope (Phase D candidates):** statement PDF downloads, Mercury webhooks (push instead of pull), per-user role gating, Slack/email alerts on sync failure, multi-currency display logic, custom transaction categorization beyond Mercury's `kind` field.
- **Pagination ceiling**: sync caps at 5 pages × 500 = 2500 tx per account per run. Bumping the lookback to 90 days makes the first sync write more rows; subsequent runs are idempotent updates. If a single account ever exceeds the cap, switch to incremental sync keyed on `max(created_at)`.
- **Next-up task**: Marketing Tools admin tab (deferred per user's directive — Finance first).

---

## Live-deploy addendum (same day)

After the implementation pass above, we wired the integration up against real Mercury infrastructure end-to-end. Notes for future-us:

### Steps that worked
1. **Supabase schema** ran cleanly with **Enable RLS** chosen at the prompt — service-role-key access path unaffected, anon/authenticated blocked. SQL file already includes the `alter table … enable row level security;` lines so subsequent re-runs don't depend on the dialog.
2. **Env vars** added to `apps/web/.env.local`: `MERCURY_API_TOKEN`, `MERCURY_API_BASE_URL`, `CRON_SECRET` (random 32-byte hex, generated via `node -e "require('crypto').randomBytes(32).toString('hex')"` and appended without ever surfacing the value to the shell).
3. **Smoke-test sync** against `http://localhost:3000/api/admin/finance/sync` with the bearer header → first successful run returned `{ ok: true, accountCount: 2, transactionCount: 11, durationMs: 1425 }`.

### Two gotchas that bit us
1. **Mercury tokens are prefixed with `secret-token:`** and the literal prefix is part of the value, not a label. Without it, Mercury responds with `401 noTokenInDBButMaybeMalformed` — the error message even tells you to "ensure that part is included." Now documented in `docs/MERCURY_INTEGRATION.md`.
2. **Sandbox vs production tokens are separate databases.** The plan called for sandbox-first, but Mercury's sandbox requires a separately-provisioned token (not self-serve from the regular dashboard). We **flipped `MERCURY_API_BASE_URL` to `https://api.mercury.com/api/v1`** and used the production read-only token. This is safe because the token is read-only — there is no path to move money. Documented in the runbook.

### Operational footnotes
- **Next.js dev does NOT hot-reload `.env.local`.** Any env change requires `Ctrl+C` and `npm run dev` again. Twice during this session we hit stale-env behavior and had to restart.
- **`TaskStop` on a background `npm run dev` only kills the npm wrapper on Windows, not the child `next dev` process.** When the user's dev was orphaned, we needed `taskkill /F /T /PID <pid>` via `MSYS_NO_PATHCONV=1` to actually free port 3000 and release the `.next/dev/lock` file.
- **`.env.local` editors race with file writes.** When the user had `.env.local` open in an editor and we appended via Node, the editor's stale buffer overwrote one of our writes on auto-save. Fix: close the editor before scripted edits. Documented as part of the workflow.

### Current production status
- Running locally against real Mercury production data, read-only token.
- 2 accounts + 11 transactions cached in Supabase. Dashboard renders.
- Vercel deployment + cron firing in production still pending (next step).

---

## Marketing Asset Library — second feature shipped today

After Finance went live, we built the **Marketing tab** end-to-end in the same session. Plan: `C:\Users\heyma\.claude\plans\abstract-spinning-stallman.md` (overwritten from the Mercury plan after planning Phase 1–4).

### Goal

A curated catalog inside admin for the team's brand assets, logos, white paper, brand guide, and marketing material — Google Drive's role reduced to "one of three places things can live," not the source of truth. **Not** a Drive replacement: at 3–5 people the equation for a full Drive API integration doesn't pencil out. Drive URLs are first-class entries alongside Supabase Storage uploads and existing static repo assets.

### Architecture

Two-table schema in Supabase:
- `marketing_assets` (parent: title, description, category enum `brand | marketing | docs`, tags text[])
- `marketing_asset_files` (variants: source_type `drive_url | storage | static`, exactly one of `storage_path` / `static_public_url` / `external_url` populated, `is_primary` partial unique index)

One logical asset like "GhostSignal Brandmark (Horizontal, White)" carries N file variants (SVG, EPS, PNG @1x/@2x/@4x, WebP).

### Phases shipped

- **Phase A** — schema + Supabase Storage bucket (`marketing-assets`, public, 50 MB limit, MIME allowlist), read-only API + dashboard skeleton with chip filters + grid + detail modal.
- **Phase B** — write API (POST asset, PATCH asset, DELETE asset with Storage cascade, POST file variant with dual-path upload, DELETE variant), AssetForm with TagInput, VariantUpload (drag-drop + Drive URL paste + signed-URL escape hatch for files > 4 MB to bypass Vercel's body-size limit).
- **Phase C** — `apps/web/scripts/seed-marketing-assets.mjs`: idempotent direct-supabaseRest seed reading `logo/`, `apps/web/public/images/{brand,for-creators,for-advertisers}/`, `brandguide/GhostSignal-BrandGuide.pdf`, `docs/WHITE_PAPER.md`. Groups density-scaled logo variants via the `LOGO_VARIANT_REGEX`. Copies non-public files into `apps/web/public/brand/{ext}/`.
- **Polish pass** — server-side preview enrichment (list endpoint now returns `previews: Record<assetId, { url, mime }>` + `variantCounts` from a parallel `marketing_asset_files` query). Cards dispatch on MIME: images render `<img>`, videos render `<video preload="metadata">` (browser-native first-frame poster), PDFs render `<object>` with the browser's built-in PDF viewer (pointer-events disabled so clicks still reach the parent button), everything else gets a styled mime-badge tile. Detail modal carries the same dispatch with a 480 px PDF hero and `<video controls>` for videos.

### Live data

Seed run hit Supabase production: **174 assets / 214 file variants / 172 files copied** into `apps/web/public/brand/`. Breakdown: Brand 149 · Marketing 23 · Docs 2. All 174 assets have exactly one primary variant (partial unique index working).

### Decisions worth remembering

- **Public Storage bucket** — same trust model as `apps/web/public/`. No signed-read-URL machinery.
- **`source_type` lives on the file row**, not the asset, so one logical asset can mix backends.
- **Three URL columns + check constraint** (`storage_path`, `static_public_url`, `external_url`) enforces exactly-one populated per file row.
- **No Drive API in v1** — Drive URLs are stored as plain text in `external_url`. A service-account integration is documented as a v2 idea in `docs/MARKETING_ASSETS.md`.
- **Inline mime sniffing** — magic-number table for 12 formats, no `file-type` npm dep.
- **Dual-path upload** — files ≤ 4 MB go through the proxy POST; larger ones request a signed URL and PUT directly to Supabase, then POST a confirm. `MAX_PROXY_UPLOAD_BYTES = 4 * 1024 * 1024` constant in `lib/marketing-assets.ts`.
- **Logo file copy duplication** — seed copies from `logo/` (tracked) to `apps/web/public/brand/{ext}/` so Next.js can serve them at stable `/brand/...` URLs. ~16 MB of duplication. The cleaner long-term answer is migrating to Supabase Storage, deferred.

### Gotchas hit and resolved during the session

- Initial tsconfig target ES2017 rejected named-capture-group regex (`(?<stem>...)`). Rewrote to positional groups.
- `asserts X is T` TypeScript narrowing requires a parameter — can't assert on a module-level const. Replaced with plain throw.
- Bare `<img>` Next.js lint warnings were suppressed with `eslint-disable-next-line @next/next/no-img-element` + rationale (mixed-source URLs, Drive thumbnails — next/image's loader is the wrong tool for internal admin).

### File counts touched

- New files: 24 (lib × 3, API routes × 4, page + components × 9, schema SQL, runbook, seed script, plus `apps/web/public/brand/**` × 172 seeded files).
- Edited: `apps/web/src/app/admin/layout.tsx` (added Marketing tab), `apps/web/src/proxy.ts` (added `/api/admin/marketing-assets/:path*` to the matcher).
- Note: the Phase A/B/C breakdown lived in tasks #14–22.

### Validation

- `npm run typecheck && npm run lint && npm run lint:css && npm run assets:audit` — all green at every phase.
- `npm run build` — `/admin/marketing` route + 4 API routes registered cleanly.
- Seed `--dry-run` then live: idempotent re-run confirmed (skipped previously-inserted rows).
- Live UI check: thumbnails render for SVG/PNG/JPG/WebP, video first-frames render for MP4/WebM, PDF first page renders inline for the brand guide.

### Outstanding actions for the user (post-deploy)

- After the next Vercel deploy of `main`: nothing new is required on the Vercel side for Marketing — no new env vars beyond what Mercury already added. The schema applies via the same Supabase project. The bucket needs to be created on the Supabase production project (same name `marketing-assets`).
- Re-run the seed against the production Supabase if you want the prod admin to be populated on day one (you ran it against the dev Supabase URL configured in `.env.local`).

### Open Phase D candidates (deferred)

- Image-combination generator (the user's original aspiration — deferred at planning time).
- Drive folder watcher service account that creates draft catalog entries.
- Per-PDF lazy-mount via `IntersectionObserver` if PDF count ever grows past ~10 (each grid card currently downloads the full PDF; one PDF today, so invisible).
- Auto-generated poster frames for videos (skipping for now — `<video preload="metadata">` first-frame is fine).
- Per-user audit log of "who viewed what" — requires the v2 auth model migration noted in the Mercury runbook.

---

## Copy Library + Social Media Scheduler — third feature shipped today

After the Marketing Asset Library, we converted `/admin/marketing` into a **sub-tab router** (Assets / Copy / Social) and shipped two more substantial features behind it: the **Copy Library** and the **Social Media Scheduler**.

Plan: `C:\Users\heyma\.claude\plans\abstract-spinning-stallman.md` (overwritten from the Asset Library plan after Phase 1–3 exploration + decisions).

### Decisions confirmed up front

- **In-app banner + daily 8 AM email digest** for alerts (Recommended option from the AskUserQuestion sweep).
- **Reuse `marketing-assets` bucket** with a `/social/<post_id>/...` path prefix for social-post images (no second bucket).
- **Copy library editable** — seed once from website + social-post packs, then add/edit/tag freely through admin.
- **Substack as a third platform tag**, same workflow as Facebook + Instagram (no separate "newsletter entity").

### Architecture

- `/admin/marketing/page.tsx` restructured to host three sub-sections via `useState<'assets'|'copy'|'social'>('assets')`. The existing Asset Library extracted into `sections/AssetsSection.tsx` with no behaviour change — pure refactor.
- New `SubTabNav` chip component sits in the `PageHeader.toolbar` slot.
- Parallel API namespaces: existing `/api/admin/marketing-assets/...` left untouched; new endpoints under `/api/admin/marketing-copy/...` and `/api/admin/marketing-social/...`. Documented as a future refactor candidate to `/api/admin/marketing/{assets,copy,social}/...` when those routes are next touched.

### Copy Library (Phase A)

- Schema: single `copy_snippets` table with `copy_snippet_kind` enum (`tagline | headline | subhead | value_prop | cta | social_hook | long_form | glossary`) + `copy_snippet_persona` enum (`creators | advertisers | both`) + freeform `tags text[]` + `favorite bool` (partial unique index for fast favorite filtering). RLS enabled with no policies.
- API: `GET/POST /api/admin/marketing-copy`, `GET/PATCH/DELETE /api/admin/marketing-copy/[id]`. Filters via PostgREST query params (`kind`, `persona`, `tag`, `search`, `favorite`).
- UI: `CopySection` with `SnippetFilters` (search + kind/persona dropdowns + favorites toggle), `SnippetList` (grouped by kind, favourites bubble in via parent sort), `SnippetCard` with **Copy** button that uses `navigator.clipboard.writeText` (fallback to `document.execCommand`) and flashes "Copied!" for 1.5 s, and `SnippetForm` (create/edit/delete in one modal).
- Seed: **56 entries live in Supabase** as of this commit — harvested from the public website (`/page.tsx`, `/for-creators/page.tsx`, `/for-advertisers/page.tsx`, `/what-is-this/page.tsx`, `/who-are-we/page.tsx`, `/signal-sheet/page.tsx`, `/snowdrift/page.tsx`) + the social-post packs at the repo root (`social_media_posts.md`, `improved_social_posts_pack.txt`, `ghost_signal_all_social_posts_pack.txt`). Breakdown: 3 taglines, 8 CTAs, 6 headlines, 8 subheads, 9 value-props, 9 social hooks, 8 long-form paragraphs, 5 glossary anchors. 5 favourites pinned (the anchor taglines + one canonical long-form line).
- Helpers added: `apps/web/src/lib/clipboard.ts` (typed wrapper with execCommand fallback), `apps/web/src/lib/copy-snippets-types.ts`.

### Social Scheduler (Phase B)

- Schema: `social_posts` (one row per planned post, with `body` + optional `body_facebook` / `body_instagram` / `body_substack` overrides + `platforms text[]` + `scheduled_at timestamptz` + `social_post_status enum`), `social_post_images` (child table, `position int` for carousel ordering), `social_post_notifications` (audit log + dedupe for the digest cron). All RLS-enabled, no policies.
- API: 5 routes — list/create, get-with-images / patch / delete (cascades to Storage), dual-path image upload (proxy ≤4 MB / signed PUT URL for larger — identical to the asset library pattern), single-image delete. PATCH auto-stamps `posted_at` on Scheduled→Posted transition + clears it on the way back.
- UI: `WeekCalendar` (7-column Mon→Sun, today highlight, prev/today/next nav, per-day "+" button), `PostCell` (platform-coloured bars + time + truncated title with draft/posted/skipped visual states), `PostComposer` (per-platform body variants reveal only when multi-platform), `PostDetail` (read mode with per-platform body resolution + status transitions + Edit/Delete/Duplicate/Prepare-to-post action cluster + inline image upload + per-image delete), `PostImageUpload` (drag-drop dual-path).
- Helpers added: `apps/web/src/lib/social-posts-types.ts` (types + `bodyForPlatform` resolver + `PLATFORM_COLORS`).

### Alerts + polish (Phase C)

- `apps/web/src/lib/email.ts` — new thin Resend wrapper (`sendEmail`, `parseRecipientList`, `escapeHtml`). Existing RQ-submission email paths intentionally left unchanged (live customer flow — refactor deferred to a separate touch).
- `POST /api/admin/marketing-social/digest` — daily cron + manual trigger. Dual auth: `Bearer CRON_SECRET` (Vercel Cron path) OR admin cookie (manual trigger from the UI / curl). Selects scheduled posts due today/tomorrow in UTC, dedupes via the `social_post_notifications` table (23-hour window), sends a rendered HTML+text digest via Resend, then writes audit rows. Returns a structured summary including `dueCount`, `notifiedCount`, `resendId`, and `via`.
- `apps/web/vercel.json` — second cron entry: `{ "path": "/api/admin/marketing-social/digest", "schedule": "0 15 * * *" }`. 15:00 UTC = 8 AM Pacific in winter / 7 AM in summer — DST drift documented.
- `DueBanner` — top-of-page alert at `/admin/marketing` that polls `/api/admin/marketing-social?from=now&to=+48h&status=scheduled` every 5 min and surfaces "N posts due in the next 48 hours" with an **Open scheduler** CTA that switches to the Social sub-tab.
- `PreparePostMode` — the "publish moment" companion launched from any Scheduled post's detail. Auto-copies the platform-specific caption to the clipboard on open (and on platform swap for multi-platform posts), lists images as direct-download links, and provides a one-click **Mark as posted** finisher that transitions status + stamps `posted_at`.
- `Duplicate` button in `PostDetail` — pre-fills a fresh composer with the source post's title / body / platforms / variants / notes scheduled **+7 days**. Images intentionally NOT carried (Storage objects stay attached to the original post). Optimised for weekly cadence.

### Proxy updates (`apps/web/src/proxy.ts`)

- Added `/api/admin/marketing-copy/:path*` and `/api/admin/marketing-social/:path*` to the matcher.
- Added `/api/admin/marketing-social/digest` to `PUBLIC_SUBPATHS` so Vercel Cron's bearer auth can reach it (same pattern as the Mercury sync allowlist; the route handler enforces the bearer-or-cookie check internally).

### Live verification

- Copy seed ran cleanly against the user's Supabase: 56 inserts, 0 skipped (first run). Re-run dry confirmed idempotency.
- Digest pipeline end-to-end verified via a silent smoke test: temporarily swapped `RESEND_DIGEST_TO` to a single verified address, restarted dev, created a synthetic scheduled post, fired `POST /api/admin/marketing-social/digest` with the `CRON_SECRET` bearer → `HTTP 200`, `sent: true`, `resendId: 56019165-7060-48d3-8d62-0262dcc3ab5b`. Email delivered. Synthetic post + backup files cleaned up; original 4-recipient list restored.
- All four AGENTS.md gates green at every checkpoint: `typecheck`, `lint`, `lint:css`, `assets:audit`. `npm run build` registers all new routes (`/admin/marketing` plus 9 new `/api/admin/marketing-{copy,social}/*` endpoints).

### Gotchas hit + resolved

- **Resend 403 in testing mode**: discovered that the Resend account currently only allows sending to the verified-owner email (`martin@ghostsignal.cloud`). Production digests to Mike / Jack / Jeremy will fail with the same 403 until the user verifies their sending domain at `resend.com/domains`. Documented in the runbook + flagged to user.
- **Next.js dev does not hot-reload `.env.local`** (re-hit, same lesson as Mercury). Required full dev-server restarts twice during the smoke test cycle.
- **`SocialPostRow`-vs-`SocialPostWithImages` typing on `composeInitial`**: the Duplicate flow needed to pre-fill the composer with a partially-cleared shape. Resolved by spreading the source post and overwriting identity / scheduling / status / images fields, which TypeScript accepts because `SocialPostWithImages extends SocialPostRow` structurally.

### Files touched

- New: `apps/web/src/lib/{clipboard,copy-snippets-types,email,social-posts-types}.ts` (4 lib files), `apps/web/scripts/seed-copy-snippets.mjs`, `apps/web/src/app/api/admin/marketing-copy/**` (2 routes), `apps/web/src/app/api/admin/marketing-social/**` (5 routes), `apps/web/src/app/admin/marketing/components/SubTabNav.tsx` + `components/copy/**` (4 files) + `components/social/**` (6 files), `apps/web/src/app/admin/marketing/sections/**` (3 files), `docs/MARKETING_COPY_LIBRARY{,_SCHEMA}.*` (2), `docs/MARKETING_SOCIAL_SCHEDULER{,_SCHEMA}.*` (2).
- Edited: `apps/web/src/app/admin/marketing/page.tsx` (now the sub-tab router), `apps/web/src/app/admin/marketing/marketing.module.css` (large additions for sub-tab nav, copy cards, calendar, post pills, composer, prepare mode, due banner), `apps/web/src/proxy.ts` (new matcher + PUBLIC_SUBPATHS entries), `apps/web/vercel.json` (second cron).

### Outstanding actions for the user

1. **Verify the sending domain on Resend** before the daily 8 AM digest can deliver to the cofounder list. Steps: resend.com/domains → Add domain → enter `ghostsignal.cloud` (or your preferred sending domain) → add the 3 DNS records → wait for the green check → confirm `RESEND_FROM` uses an address at that verified domain (e.g. `Ghost Signal Digest <digest@ghostsignal.cloud>`).
2. Production schemas already applied (per the user). Confirm the Vercel cron list shows BOTH `/api/admin/finance/sync` (`*/15 * * * *`) AND `/api/admin/marketing-social/digest` (`0 15 * * *`) after the next deploy.
3. Optional next: tee up the Vercel MCP OAuth on a Claude Code restart so env-var management can happen inline rather than in clicks.

### Phase D candidates (deferred, in runbook)

- Drag-to-reschedule on the calendar (planned for Phase C but cut — at 9 posts/month the composer-date-edit path is sufficient).
- Recent-assets sidebar in the composer pulling from the Marketing Asset Library.
- Auto-publishing to Facebook Graph / Instagram Content Publishing / Substack APIs.
- Per-user audit log + per-user favourites on the Copy Library.
- ICS calendar feed for personal-calendar subscription.
- Image-combination generator (the original aspiration; still parked).
