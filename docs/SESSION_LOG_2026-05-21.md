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

---

## Admin Sidebar Nav Refactor + Dashboard Home — fourth feature shipped today

The fourth substantial change of the day: ripped out the top-bar tab strip and replaced it with a persistent left sidebar across all `/admin/*` routes, then promoted `/admin` from a redirect into a real dashboard home. Plan: `C:\Users\heyma\.claude\plans\abstract-spinning-stallman.md` (overwritten from the Copy + Social plan after Phase 1–3 exploration).

### Decisions confirmed up front

- **Convert Marketing sub-items to real routes** (`/admin/marketing/assets`, `/copy`, `/social`) and delete the in-page chip nav (`SubTabNav`). The sidebar is now the single source of nav.
- **Inline SVG icons** in a new `components/admin/icons.tsx` (no new deps; matches the existing `Modal` / `SearchInput` / `ThemeToggle` pattern).
- **`/admin` becomes a real dashboard home** (deviation from the recommended "keep the redirect" — user picked the bigger scope).

### Architecture

- `AdminShell.tsx` refactored from a single-column layout (sticky top bar + content) into a two-row, two-column layout: top bar (logo + theme + sign-out + mobile hamburger) above a body row of `<AdminSidebar>` + content.
- New `AdminSidebar.tsx` + `AdminSidebar.module.css` — 256 px wide, fixed-left, sits below the top bar on desktop. Below 768 px the sidebar hides off-canvas; the hamburger in the top bar opens it as a drawer with backdrop + scroll-lock + Escape-close + route-change-auto-close. Pattern borrowed from the public-site `SiteHeader` mobile nav.
- Hierarchical nav data model: `AdminNavItem { href, label, icon, children? }` + `AdminNavSubItem { href, label }`. The layout passes this in instead of the previous flat `tabs[]`.
- Active state derives entirely from `usePathname()`. A row is active when the path exactly matches or starts with `href + "/"`. Parent rows get a softer "ancestor" tint when one of their children is active; the active row carries a 2 px left accent strip.
- Expansion is **URL-only**, no localStorage. A parent's children only render when the path is inside the parent's section. Trade-off: you can't preview Marketing's children without clicking in. Acceptable at 6 items; revisit if the menu grows past ~12.

### Marketing route refactor

- New `apps/web/src/app/admin/marketing/layout.tsx` owns the shared `PageHeader title="Marketing"` and the `DueBanner`. Sub-tab chip strip (`SubTabNav`) is gone.
- Three new sub-route pages: `apps/web/src/app/admin/marketing/{assets,copy,social}/page.tsx`. Each is a 3-line consumer over the existing section component — `AssetsSection`, `CopySection`, `SocialSection` are untouched.
- `apps/web/src/app/admin/marketing/page.tsx` is now a 5-line server-component `redirect("/admin/marketing/assets")`.
- `apps/web/src/app/admin/marketing/components/SubTabNav.tsx` deleted (orphan after the refactor).
- `DueBanner` updated — defaults to `<Link href="/admin/marketing/social">` for the CTA; legacy `onOpenSocial` callback prop kept optional for safety (no callers post-refactor).

### Dashboard home at `/admin`

- `apps/web/src/app/admin/page.tsx` rewritten from a one-liner `redirect("/admin/leads")` into a full dashboard composition.
- Three KPI cards in a responsive grid (3 cols → 2 → 1):
  - **Total cash** — sum of `available_balance` across Mercury accounts + 30-day net flow (green when positive) + relative last-synced badge. Pulls `/api/admin/finance/accounts` + `/api/admin/finance/transactions?limit=500`.
  - **Social posts due** — count of `status=scheduled` posts in the next 48 h, plus first 3 titles with relative times. Pulls `/api/admin/marketing-social?from=now&to=+48h&status=scheduled`.
  - **Lead pipeline** — active member count + chip grid showing counts across Discern / Court / Sign / Onboard / Run. Pulls `/api/members`.
- Each card is independently load-stateful — one card erroring doesn't blank the dashboard.
- New tiny `HomeKpiCard` primitive at `apps/web/src/app/admin/components/HomeKpiCard.tsx` carries the loading/error chrome.

### Reused utilities + tokens

- `parseAmountCents`, `sumAmountsCents`, `formatCents`, `formatRelativeTimePast` from `lib/mercury-types.ts` for the Finance card (bigint-safe math throughout — no `Number(amount)` calls).
- `MEMBER_PHASE_LABELS` from `lib/members.ts` for the Leads card.
- Sidebar tokens: `--admin-bg-elevated` (surface), `--admin-border` (right edge), `--admin-accent` (active-row strip, icon tint on active), `--admin-accent-soft` (active row bg), `--admin-accent-softer` (ancestor parent tint), `--admin-surface-hover` (hover), `--admin-z-header: 100` (sidebar layer; never crosses `--admin-z-modal: 1000`).
- Top-bar height stamped as a CSS var on the shell (`--admin-topbar-height: 64px`) so the sidebar can sit cleanly below it.

### Gotchas hit + resolved

- **The 5-min DueBanner poll** previously called `onOpenSocial()` which was a local-state setter. After the routes refactor, that callback would no-op (there's no local state to set). Made the prop optional and added a `<Link>` fallback so the banner works in both worlds.
- **`SocialPostRow.posted_at` clearing on status transitions** — handled in Phase C of the Copy/Social work; nothing new here, but tested again against the new sub-routes.
- **`usePathname()` returns `""` on first render** in some Next.js 16 conditions — handled with `?? ""` everywhere.

### Files touched

- New: `apps/web/src/components/admin/{AdminSidebar.tsx,AdminSidebar.module.css,icons.tsx}`; `apps/web/src/app/admin/marketing/{layout,assets/page,copy/page,social/page}.tsx`; `apps/web/src/app/admin/{admin-home.module.css,components/HomeKpiCard.tsx}`.
- Edited: `apps/web/src/components/admin/{AdminShell.tsx,AdminShell.module.css,index.ts}`, `apps/web/src/app/admin/{page,layout}.tsx`, `apps/web/src/app/admin/marketing/{page.tsx,components/social/DueBanner.tsx}`.
- Deleted: `apps/web/src/app/admin/marketing/components/SubTabNav.tsx`.

### Validation

- `typecheck` / `lint` / `lint:css` / `assets:audit` / `build` all green.
- New routes registered: `/admin` (dashboard home), `/admin/marketing/{assets,copy,social}` (sub-tab routes), `/admin/marketing` (now a static redirect).
- Mobile drawer behaviour verified: hamburger appears below 768 px, drawer slides in, Escape closes, route-change auto-closes, body scroll locked while open.
- Theme parity: light/dark via the existing `data-theme` attribute; sidebar follows.

### Phase D candidates (deferred)

- Persist user-toggled expansion to localStorage (current URL-only rule fine at 6 items; revisit beyond ~12).
- Section dividers / group headers (only worth adding past 8–10 top-level items).
- Sidebar-level search ("⌘ K") to jump to any section/sub-section.
- Sidebar bottom slot for status (last Mercury sync) or quick actions.
- Dashboard "today" widgets — recent task changes, latest RQ submissions, recent admin activity log.

---

## Marketplace Pool / Match / Map sidebar sub-items — small follow-up to the nav refactor

A regression flagged by the user immediately after the sidebar refactor: Marketplace has three views (Pool / Match / Map) that used to live in local state inside `/admin/marketplace/page.tsx`. The new sidebar didn't expose them.

### What changed

- `AdminSidebar` gained **query-param-aware active detection**. `AdminNavSubItem` now accepts an optional `isDefault: boolean`. New helpers `parseHref()` + `subItemActive()` compare both pathname and search params; existing path-only sub-items (Marketing's Assets/Copy/Social) are unaffected.
- `AdminShell` wraps **both** the sidebar and the main content area in `<Suspense fallback={null}>` so any admin page using `useSearchParams` (now including the marketplace) doesn't break Next.js static prerendering of the route tree.
- `admin/layout.tsx` — Marketplace gained three children: `?view=pool` (marked `isDefault: true` so it stays active on the bare `/admin/marketplace` URL too), `?view=match`, `?view=map`.
- `marketplace/page.tsx` — `view` is derived from `useSearchParams()`; `setView` does `router.replace(url, { scroll: false })` so the URL stays the source of truth. The marketplace's existing page-local sidebar (brand title + stats + reset/help buttons) stays as-is; it now reads/writes the same URL state the global sidebar drives.

### Why query params, not real sub-routes (like Marketing)

The marketplace page is ~550 lines with Phaser dynamic imports, a `useSyncExternalStore` over localStorage, modals for reset/help, and selected-entity state shared across views. Splitting into three sub-routes would mean extracting all that into a shared layout-level context — meaningful refactor for negligible gain. Query params keep the existing structure and let the sidebar deep-link.

### Commit

`df79bae feat(admin): marketplace Pool/Match/Map as sidebar sub-items` — 4 files, +111 / -19.

---

## Three-day deploy outage — diagnosed and fixed late afternoon

After all the day's feature work, the user noticed nothing had reached production for three days — `ghostsignal.cloud` was still serving the build from commit `9c66a8f` (the last commit before today's batch). Every push since had silently failed to deploy.

### The investigation

- **Git was healthy.** `origin/main` had all five commits we'd pushed today. `git log` confirmed.
- **Vercel was reachable.** Manual curls to `https://www.ghostsignal.cloud` returned correctly via Vercel edge.
- **The proxy was running** — `/admin/*` correctly redirected to `/admin/login`. But that's a fixed-Vercel behaviour and doesn't prove which build is serving.
- **The smoking gun**: every new admin API route returned **404** in production. `/api/admin/finance/sync`, `/api/admin/marketing-copy`, `/api/admin/marketing-social/digest` — all not in the deployed build.
- **Vercel deployment list** (per a user screenshot) showed only the same 3-day-old `9c66a8f` commit, with three "Redeploy of …" entries — manual redeploys of the stale SHA. Zero commit-triggered deploys for any of today's pushes.
- **The MCP path failed.** We tried twice to bind Vercel's MCP server (`https://mcp.vercel.com/sse`) into Claude Code via `/mcp` + full session restarts. The handshake printed "Authentication successful, but server reconnection failed" both times; no `mcp__vercel__*` tools ever surfaced in the session. Continuing to retry was wasting cycles.
- **Pivoted to the Vercel REST API directly.** User generated a personal Vercel API token (`vcp_…`, scoped to the `ghostsignal` team) and dropped it into `apps/web/.env.local` as `VERCEL_API_TOKEN`. From there we could probe everything programmatically without touching the MCP.

### The root cause

A POST to `/v13/deployments` (manual deploy trigger) returned `HTTP 400` with the error:

> `cron_jobs_limits_reached`: *"Hobby accounts are limited to daily cron jobs. This cron expression (\*/15 \* \* \* \*) would run more than once per day."*

The user's Vercel project sits on the free **Hobby tier**. Three days ago we shipped commit `d5b16a5` (Finance tab + Mercury sync) which introduced `apps/web/vercel.json` with a 15-minute cron entry. Hobby tier rejects any cron more frequent than daily, **and rejects the entire deployment** alongside it. The validation happens at deploy-creation time, before any build runs — so no failed-build rows showed up in the Deployments tab. Every push since `d5b16a5` carried the same `vercel.json` and was silently rejected.

### The fix

The user chose to stay on the free Vercel tier and trigger the Mercury sync from an external scheduler instead. Commit `597d962 chore(ops): move Mercury sync cron from Vercel to GitHub Actions`:

- **`apps/web/vercel.json`**: dropped the `*/15 * * * *` entry. Kept the once-daily Marketing digest at `0 15 * * *` (under the Hobby limit).
- **`.github/workflows/mercury-sync.yml`** — new file. Schedule `*/15 * * * *` + manual `workflow_dispatch`. Single curl POST to `MERCURY_SYNC_URL` with `Authorization: Bearer ${{ secrets.CRON_SECRET }}`. Concurrency group `mercury-sync` with `cancel-in-progress: true` so back-to-back runs don't stack. 5-minute timeout per run.
- **`docs/MERCURY_INTEGRATION.md`** — updated architecture diagram (GitHub Actions → POST), added a paragraph explaining the Vercel Hobby limitation as historical context, expanded the setup checklist to spell out the THREE places `CRON_SECRET` now lives (`.env.local`, Vercel env vars, GitHub Actions Secrets) plus the new `MERCURY_SYNC_URL` GitHub secret. Replaced the "Vercel Dashboard → Crons" monitoring section with "Repo → Actions → 'Mercury sync'".

The moment that commit was pushed, the Vercel webhook fired and a build for `597d962` went `BUILDING` → `READY` in 80 seconds. Production now reflects every commit we've pushed today. End-to-end verification:

| Path | Before fix | After fix |
|---|---|---|
| `/admin/marketing/copy` | 404 (route not in build) | 307 (proxy redirect to login) |
| `/admin/marketing/social` | 404 | 307 |
| `/admin/marketing/assets` | 404 | 307 |
| `/api/admin/finance/sync` | 404 | 405 (POST-only, route exists) |
| `/api/admin/marketing-copy` | 404 | 401 (proxy gating it, route exists) |
| `/api/admin/marketing-social/digest` | 404 | 405 (POST-only, route exists) |

### Lessons captured

- **Vercel's free tier validates `vercel.json` cron expressions at deploy-creation time, not at build time.** When validation fails, the failure does NOT appear as a failed-deploy row in the dashboard — the deploy simply isn't created. Easy to miss.
- **The Vercel MCP (`mcp.vercel.com/sse`) didn't bind reliably in this Claude Code setup.** Tried full session restarts twice. The Vercel REST API + a personal API token (`VERCEL_API_TOKEN` in `.env.local`) is the working path for now.
- **The webhook integration is healthy** — the moment the cron-config was valid, the next push deployed within seconds.

### Outstanding setup the user owns

- Add two GitHub Actions secrets at `github.com/MDGhostSignal/web → Settings → Secrets and variables → Actions`:
  - `CRON_SECRET` — same value as in `apps/web/.env.local` + Vercel env vars.
  - `MERCURY_SYNC_URL` — `https://www.ghostsignal.cloud/api/admin/finance/sync`.
- Once those exist, the workflow fires at the next quarter-hour boundary. Manual test: Actions tab → "Mercury sync" → Run workflow.
- Still outstanding from earlier today: verify the sending domain at `resend.com/domains` so the Marketing daily digest can deliver to all cofounders (today only Resend's verified-owner email is accepted).

### End-of-day status (added after the Mercury workflow went live)

- Both GitHub Actions secrets are now configured on the `MDGhostSignal/web` repo: `CRON_SECRET` (same value as `.env.local` and Vercel env vars) + `MERCURY_SYNC_URL` (`https://www.ghostsignal.cloud/api/admin/finance/sync`).
- The `Mercury sync` workflow has been manually dispatched + completed green. The 15-minute schedule takes over from here; the next automatic run lands at the next `*/15` boundary (GitHub Actions best-effort).
- That closes today's Mercury → Supabase loop end-to-end in production: GitHub Actions → POST sync route → `runMercurySync()` → Supabase upsert → admin dashboard reads cached rows. Live.
- The only setup task remaining for the team (not blocking anything we shipped today) is the Resend sending-domain verification so the Marketing daily digest at `0 15 * * *` can deliver to cofounders.

---

## Contracts tab (esignatures.com integration) — fifth feature shipped today

A sixth top-level admin tab — **Contracts** — that becomes the team's single pane of glass for every creator + brand agreement. Mirrors the corpus from esignatures.com into Supabase via webhook events, surfaces awaiting/expiring/active KPIs, auto-links signers to CRM members by email, and adds an in-app composer for sending new contracts without leaving the CRM.

Plan: `C:\Users\heyma\.claude\plans\abstract-spinning-stallman.md` (overwritten after the deploy-outage post-mortem).

### Up-front discoveries that shaped the schema

Phase A ran `apps/web/scripts/probe-esignatures.mjs` against the live esignatures account before locking any schema. Key facts surfaced:

1. **HTTP Basic auth with the API token as username, empty password.** Bearer auth is rejected with `403`. The literal docs mention a `?token=` query-param variant too; Basic was used because it keeps the token out of URL logs.
2. **There is no `GET /contracts` list endpoint.** Trying it returns `{ status: "error", data: { error_code: "not-supported" } }`. The plan's "backfill by paginating /contracts" idea was scrapped — discoverability has to come from webhooks + caller-known ids. Import-by-id is the only manual backfill path.
3. **The contract envelope is `{ data: { contract: {…} } }`** — one level deeper than the templates endpoint's `{ data: {…} }`. Unwrapped in `lib/esignatures.ts`.
4. **Only one active template at the moment** and it carries an empty `placeholder_fields: []`, which simplifies the Phase C composer (no template fields to render today — but the dynamic renderer handles them for future templates).

### Phase A — Foundation

- Schema: `docs/CONTRACTS_SUPABASE_SCHEMA.sql`. Five tables: `contracts` (id PK is the esignatures contract id, raw jsonb of the full API payload, both `member_id` confirmed + `suggested_member_id` auto-match, status enum, counterparty kind enum, soft-archive via `archived_at`), `contract_signers`, `contract_templates`, `contract_webhook_events` (audit log including invalid-signature attempts), `contract_sync_runs` (audit row per manual import / resync). RLS enabled with no policies — service-role bypass intentional.
- `apps/web/src/lib/esignatures-types.ts` — `EsignaturesContract`, `EsignaturesSigner`, `EsignaturesTemplate` wire shapes + `ContractRow` / `ContractSignerRow` / `ContractTemplateRow` DB shapes + `CONTRACT_STATUSES` / `CONTRACT_STATUS_LABELS` / `CONTRACT_AWAITING_STATUSES` / `CONTRACT_ACTIVE_STATUSES` / `COUNTERPARTY_KINDS` constants + small helpers (`normalizeStatus`, `parseIsoOrNull`).
- `apps/web/src/lib/esignatures.ts` — typed REST client. Functions: `listTemplates`, `getTemplate`, `getContract`, `createContract`, `withdrawContract`, `resendSigner`. `EsignaturesError` class carries status + path + detail.
- `apps/web/src/lib/esignatures-webhook.ts` — HMAC-SHA256 signature verification (timing-safe), payload extraction (tolerant of both `data.contract` and top-level shapes), `upsertContractFromApi(contract, { presetMemberId? })` which preserves existing notes / `member_id` / `archived_at` and computes `suggested_member_id` via signer-email matching that skips `@ghostsignal.cloud` (our own countersigner) and only fires when exactly one CRM member matches one signer email.
- `apps/web/src/lib/members.ts` — added `findMembersByEmail(email)` lookup used by the webhook + import flows.

### Phase B — Dashboard

- API routes — eight new endpoints:
  - `GET/POST /api/admin/contracts` — list (filters: `status` / `counterparty` / `unlinked` / `archived` / `search` / `limit` / `offset`; default order is `updated_at` desc nullslast then `created_at` desc; default excludes archived). POST dispatches on body shape: `{ contract_id }` triggers Import-by-id (calls `getContract`, upserts, writes `contract_sync_runs` row with `scope='manual-import'`); `{ template_id }` triggers Phase C Send-from-CRM (see below).
  - `GET/PATCH/DELETE /api/admin/contracts/[id]` — single-contract read with hydrated linked + suggested member rows; PATCH validates `member_id` (UUID or null), `suggested_member_id`, `counterparty_kind`, `notes`, `archived_at`; DELETE is soft (sets `archived_at`).
  - `POST /api/admin/contracts/[id]/resync` — manual safety-valve fetch + upsert for when a webhook delivery is dropped.
  - `POST /api/admin/contracts/[id]/remind` — proxies the per-signer reminder endpoint.
  - `GET /api/admin/contracts/templates` — live passthrough to esignatures (corpus is tiny; no local cache needed yet).
  - `POST /api/admin/contracts/webhook` — public-allowlisted in `proxy.ts`. Reads raw body for HMAC, always inserts an audit row regardless of validity (`signature_valid: true/false`), 401s on invalid signature, 200s even on malformed payloads so esignatures doesn't retry-storm a broken handler.
  - `GET /api/admin/members/lite?ids=…` or `?q=…` — small batch / search endpoint for hydrating linked-member names in the contracts dashboard and powering the composer's MemberPicker. Returns name / email / org / member_type fields only.
- Dashboard UI at `/admin/contracts`:
  - `ContractsKpiRow` — three cards: Awaiting Signature (sent + viewed), Expiring Soon (active with `expires_at` within 30 days), Active (signed + completed, not archived). Mount-time `Date.now()` snapshot via lazy `useState` initializer to satisfy `react-hooks/purity` (the rule rejects `Date.now()` in render bodies and `setState` inside `useEffect`).
  - `ContractsFilterSidebar` — sticky left rail. Quick filters (All / Needs linking / Archived) + Status (8 statuses) + Counterparty (creator / brand / other), each with live counts derived from in-memory rows.
  - `ContractsTable` — DataTable-backed, six columns (Contract title + truncated id / Counterparty badge / Status badge / Signed date / Expires date / Linked-to member), all sortable, title cell is a `<Link>` to the detail page.
  - `ImportContractModal` — paste an esignatures contract id, server fetches + upserts.
  - `ContractComposer` (Phase C — see below) launched from the header.
- Detail view at `/admin/contracts/[id]`:
  - `ContractDetailCard` — title + status pill + Resync / Archive header actions, metadata grid (Sent / Signed / Expires / Template / Counterparty dropdown), Internal-notes textarea with dirty-tracking + Save/Cancel actions, signer list with per-signer Send-reminder buttons (only shown when contract is `sent` or `viewed` and the signer hasn't signed yet).
  - `ContractPdfEmbed` — `<object data type="application/pdf">` when esignatures has published the signed PDF URL, fallback placeholder otherwise. Mirrors the asset library's PDF embed pattern.
  - `LinkMemberPanel` — three states: (1) Linked → name + Unlink button. (2) Suggested match → Confirm / Reject + an "or pick a different member" search-pick widget. (3) Unlinked → search-pick widget. Each action PATCHes the contract endpoint.

### Phase C — Send new contract composer

- `POST /api/admin/contracts` `template_id` branch implemented (was a 501 stub at the end of Phase B). Validates signers (each needs name + valid email), normalises placeholder fields, auto-attaches `metadata.ghostsignal_member_id` + `metadata.source: "ghostsignal-crm"`, calls `createContract`, then persists locally via `upsertContractFromApi` with `presetMemberId` so the dashboard sees the new row without waiting on the webhook.
- `ContractComposer` modal: template dropdown (live-fetched on open) → `MemberPicker` (search + pick — auto-fills the first signer's name + email from the chosen member) → `TemplateFieldsRenderer` (dynamic per template's `placeholder_fields`; handles text/date/number/checkbox/select/dropdown/signature types, surfaces a warning under unknown types and passes them through as text) → signer-list editor (multi-signer with add/remove) → optional title override + "Send as test" toggle → Submit. On 201, parent reloads the list and `router.push`es to the new contract's detail page.
- `MemberPicker` — debounced search (220 ms) against `/api/admin/members/lite?q=…`, picked-state card with Change action.
- `TemplateFieldsRenderer` — input dispatch by type, supports default values + required flags, unknown types annotated rather than failing.

### Gotchas hit + resolved

- **`react-hooks/purity` rejects `Date.now()` in render and `setState` inside `useEffect`.** Fix: lazy `useState` initializer `useState<number>(() => Date.now())` snapshots once at mount; counts derive via `useMemo` from that snapshot plus the row data.
- **Turbopack SWC worker crash on the detail page** ("Jest worker encountered 2 child process exceptions, exceeding retry limit") — surfaced when clicking a contract from the list. Two compounding factors: stale `.next` cache from earlier feature work + `reactCompiler: true` in `next.config.ts` (the React Compiler uses `jest-worker` for its pool — that's where the misleading error name comes from). Two-part fix: (1) refactored `/admin/contracts/[id]/page.tsx` into a tiny server shell that `await`s `params` and forwards the id as a prop to a new `ContractDetailView` client component, keeping `use(params)` out of the client tree; (2) hoisted inline `async () => { await foo(); setX(false); }` arrow handlers in `ContractDetailCard` to stable `useCallback`s (a known React-Compiler trip-hazard), lifted a nested ternary + type-cast inside the counterparty `<select>` `onChange` to a plain `parseKind()` helper, hoisted an inline `style={{…}}` literal to a module-level `const`. After deleting `.next` and restarting dev, the detail page rendered cleanly (`GET /admin/contracts/<uuid> 200`).
- **`use(params)` in a client component** worked in production builds (build passed every gate) but tripped Turbopack dev-mode compilation. The server-shell pattern is the safer convention going forward.

### Layout regression on Marketplace + Tasks pages — fixed in the same pass

User flagged that `/admin/marketplace` (Pool + Match) and `/admin/tasks` had their inner content slipping behind the admin sidebar at common viewport widths, while `/admin/leads`, `/admin/finance`, and `/admin/contracts` looked correct.

Root cause: both pages used a `width: 100vw; margin-left: calc(50% - 50vw)` viewport-breakout pattern that assumed `AdminShell` centred its content with `margin: 0 auto`. AdminShell actually **offsets** content with `margin-left: 256px` on desktop (to clear the fixed admin sidebar), leaving the right margin auto. The breakout math then overshot to the left and pushed the inner page content under the sidebar.

Fix: removed the breakout from `marketplace.module.css .page` and `tasks/page.module.css .layout`. Both pages now sit inside AdminShell's natural content box, which already provides the 256-px sidebar offset and the `var(--admin-space-6)` lateral padding that leads / finance / contracts use. The "template" is now consistent: pages don't need width/margin overrides — AdminShell does the layout work.

### Validation

All AGENTS.md gates green:
- `typecheck` — clean.
- `lint` — clean (after the `react-hooks/purity` + `react-hooks/set-state-in-effect` fixes).
- `lint:css` — clean.
- `assets:audit` — `OK: 51 referenced public assets exist.`
- `build` — clean. New routes registered: `/admin/contracts`, `/admin/contracts/[id]`, plus `/api/admin/contracts`, `/api/admin/contracts/[id]`, `/api/admin/contracts/[id]/remind`, `/api/admin/contracts/[id]/resync`, `/api/admin/contracts/templates`, `/api/admin/contracts/webhook`, `/api/admin/members/lite`.

Live verification: dev server `npm run dev` after `rm -rf .next` rendered `/admin/contracts` and `/admin/contracts/<id>` without crashes; API endpoint returned the persisted contract with hydrated linked/suggested-member rows.

### Files touched

- New (`apps/web/src/lib/`): `esignatures.ts`, `esignatures-types.ts`, `esignatures-webhook.ts`.
- New (API routes — 7 files): `apps/web/src/app/api/admin/contracts/route.ts`, `apps/web/src/app/api/admin/contracts/[id]/route.ts`, `apps/web/src/app/api/admin/contracts/[id]/resync/route.ts`, `apps/web/src/app/api/admin/contracts/[id]/remind/route.ts`, `apps/web/src/app/api/admin/contracts/templates/route.ts`, `apps/web/src/app/api/admin/contracts/webhook/route.ts`, `apps/web/src/app/api/admin/members/lite/route.ts`.
- New (`apps/web/src/app/admin/contracts/`): `page.tsx`, `contracts.module.css`, `[id]/page.tsx` (server shell), `[id]/ContractDetailView.tsx` (client view), `components/ContractsKpiRow.tsx`, `components/ContractsFilterSidebar.tsx`, `components/ContractsTable.tsx`, `components/ContractDetailCard.tsx`, `components/ContractPdfEmbed.tsx`, `components/LinkMemberPanel.tsx`, `components/ImportContractModal.tsx`, `components/ContractComposer.tsx`, `components/MemberPicker.tsx`, `components/TemplateFieldsRenderer.tsx`.
- New (scripts + docs): `apps/web/scripts/probe-esignatures.mjs`, `docs/CONTRACTS_SUPABASE_SCHEMA.sql`.
- Edited: `apps/web/src/app/admin/layout.tsx` (added Contracts entry with `IconContracts`), `apps/web/src/components/admin/icons.tsx` (added `IconContracts` — paper outline + ruled lines + signature flourish), `apps/web/src/lib/members.ts` (added `findMembersByEmail`), `apps/web/src/proxy.ts` (allowlisted `/api/admin/contracts/webhook` in `PUBLIC_SUBPATHS`; added `/api/admin/contracts/:path*` + `/api/admin/members/:path*` to the matcher), `apps/web/src/app/admin/marketplace/marketplace.module.css` + `apps/web/src/app/admin/tasks/page.module.css` (removed viewport-breakout that overlapped the admin sidebar).

### Outstanding actions for the user

1. **Configure the esignatures.com webhook URL** at https://esignatures.com → Account → API & Webhooks → Webhooks. URL: `https://www.ghostsignal.cloud/api/admin/contracts/webhook`. Enable all contract events (contract_signed / contract_sent / contract_viewed / contract_declined / contract_expired / contract_withdrawn). No separate signing secret — esignatures HMACs with the API token, same value we have. Verify via `select event_type, signature_valid, received_at from contract_webhook_events order by received_at desc limit 5;`.
2. **Confirm `ESIGNATURES_API_TOKEN` is present in Vercel production env vars** (currently only required for `.env.local`; production webhook receiver will 401 without it).
3. **Backfill any historical contracts that matter** via the "Import by ID" button on the dashboard — copy the contract id from its esignatures.com URL, paste, submit. There is no bulk list endpoint (verified by the Phase A probe), so this is one-at-a-time.
4. **Set counterparty kind** (creator / brand / other) on imported contracts via the dropdown on the detail page — filters in the sidebar key off this.
5. Carry-over from earlier: Resend domain verification still blocks the Marketing daily digest from reaching cofounders other than the verified-owner email.

### Phase D candidates (deferred)

- Bulk-send to a list of creators / brands (composer is one-at-a-time today).
- Contract version history (esignatures supports it; we render current state only).
- Effective-date column populated from `placeholder_fields` (today's only template carries no fields, so deferred).
- Automated renewal-reminder emails when `expires_at` is within N days.
- ICS calendar feed for upcoming contract expirations.
- "Approve before send" workflow for cofounder review of outgoing contracts.
- Per-PDF caching to avoid re-downloading the signed PDF on every detail-page view.
