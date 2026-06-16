# Session Log — 2026-06-17

Picking up where yesterday's Studio scaffolding left off. Today was a
mix of **deployment fixes** (Vercel was failing), **bug squashes**
across surfaces touched yesterday (build error, transparent popover,
broken theme toggle), a **complete revert of the HQ rename**, the
new **Pages overview tab**, and **visual polish** on the XQ + RQ
quiz intros — including replacing the static brandmark on the RQ
intro with the live RQ wordmark.

11 commits today, all on top of yesterday's `656a757` session log.

## 1 · HQ rename — reverted

The `/admin` → `/hq` rename shipped yesterday in `52c299e` was
load-bearing for in-progress work that broke after the move (the
user discovered downstream tooling depended on `/admin`). Spent ~10
min reversing it cleanly so git history is preserved.

- `apps/web/src/app/hq/` → `apps/web/src/app/admin/` (90+ files,
  detected as git renames).
- `proxy.ts`: matcher `/hq/:path*` → `/admin/:path*`; login
  redirect target `/hq/login` → `/admin/login`.
- 75 inline href + path strings reverted across 14 files.
- Sidebar lockup + login brand tag + `AdminShell` aria-label/alt all
  back to "Admin"/"GhostSignal Admin".
- `.stylelintignore` reverted.
- Studio code comments updated to point to `/admin` (the proper
  destination since the rename is gone).

Task #19 (rename admin → HQ) marked **deleted** in the task list.

Commit: `7a883a3`.

## 2 · Pages overview tab (`/admin/pages`)

User asked for a one-stop catalog of every page in the project.
Built it as a Server Component that statically declares a categorized
registry. **40 routes across 10 categories**:

- Public marketing (8 — Home, For Brands, For Creators, etc.)
- Assessments + previews (7 — XQ Quiz, RQ Quiz, XQ Characters v1/v2,
  X-Deck)
- World (1 — Phaser RPG)
- Studio (5 — login, register, dashboard, pending, marketplace)
- Admin core CRM (6)
- Admin quiz responses (2)
- Admin campaigns + finance + ops (5)
- Admin marketing (4)
- Admin utilities (2 — login + this Pages page)
- Developer / reference (1 — Design System)

Each card surfaces: name, path, one-line description, tags (`public`
/ `client` / `internal` / `auth-gated` / `dev`). Clicking a card
navigates. Dynamic routes like `/admin/contracts/[id]` render as
non-clickable info cards.

When a page is added or renamed, refresh the `CATEGORIES` array at
the top of `apps/web/src/app/admin/pages/page.tsx` — single source
of truth.

Sidebar entry added to `admin/layout.tsx`.

Commits: included in `7a883a3` (the new page file came over with the
revert), `50d6640` (sidebar wiring).

## 3 · Build error fix — split `studio-auth` into client + server

Symptom: Turbopack refused to build, saying client components were
pulling in `next/headers` (server-only) via `lib/studio-auth.ts`.

Root cause: `studio-auth.ts` exported both the browser client
(`createStudioBrowserClient`) AND the server functions (which import
`cookies` from `next/headers`). Client components imported only the
browser client, but the bundler pulled in the whole module.

Fix:
- **`lib/studio-auth-client.ts`** (new) — `"use client"`, exports
  `createStudioBrowserClient` only. Browser-safe.
- **`lib/studio-auth.ts`** — added `import "server-only"` so any
  accidental client import fails loud with a clear message. Keeps
  `createStudioServerClient`, `createStudioAdminClient`,
  `loadCurrentStudioMember`.
- 3 client components (`login`, `register`, `SignOutButton`) updated
  to import from the new client file.

Commit: `f078be7`.

## 4 · Visual bugs — alerts popover + design system theme

Two unrelated bugs reported in one round:

### Alerts popover (`/admin/*`)

`.panel` background was `var(--admin-surface-1)` which is a
4%-alpha white. Reads transparent over non-uniform page content —
clicking the bell showed alerts bleeding through the page beneath.

Fix: switch to `var(--admin-bg-elevated)` — solid `#141418` dark /
`#ffffff` light. Now a discrete layer.

### Design system theme toggle (`/design-system`)

The toggle button existed but did nothing — `.page` hardcoded the
dark `--ds-*` values and `.page.dark` was an empty comment.

Fix:
- `.page` now defines **light** defaults (`#fafafa` bg, `#0a0a0b`
  text, etc.).
- `.page.dark` overrides with the **dark** values.
- The hardcoded `rgba(10, 10, 11, 0.85)` header bg and the radial-
  gradient rgbas tokenized to `--ds-header-bg`, `--ds-bg-gradient-a`,
  `--ds-bg-gradient-b` so they flip with the rest.

Sun icon = light theme active, moon icon = dark theme active — now
matches what the UI always implied.

Commit: `46f784a`.

## 5 · Vercel deploy — force-dynamic + env-var documentation

Build failed during the static prerender phase:

```
Error: Studio auth: NEXT_PUBLIC_SUPABASE_URL and
NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.
```

Two issues stacked together:

1. The `NEXT_PUBLIC_SUPABASE_*` env vars weren't set in Vercel
   (they were only in local `.env.local`).
2. Studio + admin/studio-approvals pages were being statically
   prerendered, but they call `loadCurrentStudioMember()` which
   needs auth context — would always fail at build time.

Fixes:
- **`export const dynamic = "force-dynamic"`** added to
  `/studio/page.tsx`, `/studio/marketplace/page.tsx`,
  `/studio/pending/page.tsx`, `/admin/studio-approvals/page.tsx`.
  These pages render per request — no static output is meaningful.
- Martin added the two env vars to Vercel (Production + Preview +
  Development). Build succeeded after that.

Also wrote **`docs/VERCEL_ENV.md`** — full inventory of every
`process.env.*` the project reads. Grouped by purpose (Supabase,
admin auth, cron, email, quizzes, Mercury, ART19, esignatures,
Sheets, marketing, alerts, world, webhooks) with required/optional +
sensitive flags per row. Includes the explicit Studio publishable
key values so future-me doesn't have to re-derive them from the
Supabase dashboard.

Commits: `df9d3bd`, `253ce06`.

## 6 · RQ wordmark — yellow → magenta sunset

User wanted the RQ wordmark recolored to **yellow → magenta** —
replacing yesterday's magenta-to-cyan retrowave palette.

- **Front-face gradient** flipped from horizontal magenta→cyan to a
  diagonal sunset: warm yellow `#ffd23f` at bottom-left, through
  orange-pink (`#ffa53f`, `#ff5fa8`), up to hot magenta `#ff2e88`
  at top-right. Gradient direction is now diagonal (`x1=0 y1=1` →
  `x2=1 y2=0`).
- **Depth slice ramp** tweaked from deep navy → magenta to dark
  amber → warm pink. Sits cleanly under the new front gradient.
- **Mouse-tracked light** retinted from cool cyan to sun-flare warm
  yellow.

Same component, completely different mood. XQ wordmark untouched.

Also at the same time: **10% shrink** on the in-card wordmarks on
the XQ intro (the marks shown inside the XQ + RQ phase cards).
`.xq-intro-phase-mark` height 88px → 79px. The SVG scales with the
container so the wordmark gets ~10% smaller in both dimensions.

Commit: `13dfca0`.

## 7 · XQ intro vertical scroll fix

After the wordmark shrink, the XQ intro still spilled below the
viewport because the two phase cards were constrained to 760px
max-width — descriptions wrapped onto more lines than necessary.

- `.xq-intro` max-width: 920 → 1080.
- `.xq-intro-phases` max-width: 760 → 960, gap 20 → 22, margin-
  bottom 36 → 28.

Cards gain ~80px horizontal each → descriptions wrap fewer lines →
intro fits within a single viewport on a typical laptop.

Commit: `53cad19`.

## 8 · RQ quiz intro — brandmark → RQ wordmark + CTA copy

User wanted the RQ wordmark to also live on the RQ quiz intro
(`/rq-quiz`), replacing the small vertical GhostSignal brandmark.

- `IntroStep.tsx` — replaced the `<Image src="/images/brand/
  brandmark-vert-white.svg" />` with `<RQ3DWordmark />` (imported
  from `xq-quiz/Wordmarks3D`). New CSS class `.rq-brand-wordmark`
  sizes it 300px wide on desktop, 240px on mobile.
- `page.tsx` — the nav CTA on the intro step now reads **"Start →"**
  instead of **"Continue →"**. Every subsequent step keeps
  "Continue →" and the final step keeps "Generate My RQ →". Logic
  uses the existing `isIntroStep` boolean.

Commit: `fe5c5da`.

## 9 · RQ quiz "research behind" panel — give it a background

The expandable `<details>` panel at the bottom of the RQ intro
(`"The research behind the GhostSignal RQ"`) had no rest-state
background — only a left-border accent stripe. Against the dark
foggy backdrop, it disappeared until you hovered.

- 6%-amber rest background + 18%-amber border + the existing 3px
  accent stripe. `backdrop-filter: blur(4px)` softens the fog
  behind it.
- Hover → 10% bg / 28% border (was 5% bg only).
- Open → 8% bg holds steady.

Commit: `efdb328`.

## 10 · Studio registration — works under email confirmation

Symptom: clicking **"Request access"** at `/studio/register`
returned `"No active session."`

Root cause: Supabase Auth had "Confirm email" enabled (default).
`signUp` returns the user but **NO session** until the user clicks
the verification email — no cookies were ever set, so the
server-side cookie check in `/api/studio/register` failed.

Fix:
- `/api/studio/register` no longer requires a session cookie.
  Instead, it verifies the claimed `authUserId` via Supabase's
  admin API (`admin.auth.admin.getUserById`) and confirms the email
  matches. Works whether or not the browser has a session.
- `/studio/register` reads `data.session` after `signUp`:
  - If a session exists → redirect to `/studio/pending` (they're
    signed in).
  - If null (email confirmation pending) → redirect to
    `/studio/login?registered=1`.
- `/studio/login` reads `?registered=1` and shows "Registration
  received. Check your email for a confirmation link, then sign in
  below." instead of the normal "Welcome back" copy.

Commit: `5dacfb6`.

### Follow-on Resend wiring

Hit Supabase's default 2-emails-per-hour SMTP limit during testing.
Martin wired **Resend as Supabase's SMTP provider**:

- Supabase dashboard → Auth → SMTP Settings:
  - Host: `smtp.resend.com`
  - Port: `465`
  - User: `resend`
  - Pass: `RESEND_API_KEY`
  - Sender: same as `RESEND_FROM`

Should also verify Site URL + Redirect URLs allowlist in Supabase
**Authentication → URL Configuration** are pointed at
`https://ghostsignal.cloud` — note for tomorrow.

## Files touched today

### New
- `apps/web/src/app/admin/pages/page.tsx`,
  `apps/web/src/app/admin/pages/page.module.css`
- `apps/web/src/lib/studio-auth-client.ts`
- `docs/VERCEL_ENV.md`

### Renamed (git rename, history preserved)
- `apps/web/src/app/hq/` → `apps/web/src/app/admin/` (the revert)

### Modified (highlights)
- `apps/web/src/proxy.ts`
- `apps/web/src/components/admin/AdminShell.tsx`,
  `AlertsBell.module.css`, `AdminSidebar.tsx`, `AlertsBell.tsx`,
  `ShortcutHelp.tsx`
- `apps/web/src/app/admin/layout.tsx` (added Pages sidebar entry)
- `apps/web/src/app/admin/login/page.tsx` (brand tag revert)
- `apps/web/src/app/admin/studio-approvals/page.tsx`
- `apps/web/src/app/studio/{page,pending/page,marketplace/page,
  login/page,register/page}.tsx`
- `apps/web/src/app/api/studio/register/route.ts`
- `apps/web/src/lib/studio-auth.ts`
- `apps/web/src/app/xq-quiz/Wordmarks3D.tsx`,
  `apps/web/src/app/xq-quiz/xq-quiz.css`
- `apps/web/src/app/rq-quiz/IntroStep.tsx`,
  `apps/web/src/app/rq-quiz/page.tsx`,
  `apps/web/src/app/rq-quiz/rq-quiz.css`
- `apps/web/src/app/design-system/design-system.module.css`
- `apps/web/.stylelintignore`

## Validation

- `npm run typecheck` (web) — clean throughout the day.
- Pre-ship lint gate triggered three times today; each time fixed
  in the same turn (apostrophe escape, `.stylelintignore` add,
  unused import cleanup).
- Production deploy confirmed working at `ghostsignal.cloud` after
  the env vars + force-dynamic shipped.

## Open / next-step notes

### Hot
- **Verify Studio registration end-to-end via Resend** — Martin to
  finish the smoke test:
  1. Register at `https://ghostsignal.cloud/studio/register` with a
     fresh test email.
  2. Verify the Resend dashboard → Logs shows the email going out.
  3. Click the confirmation link → bounces to Studio.
  4. Approve in `/admin/studio-approvals`.
  5. Refresh → land on dashboard.
- **If anything in the chain fails, paste the symptom + DevTools
  Network response.** Most likely failure: Resend sender domain not
  verified (fix in Resend dashboard) or Supabase Site URL pointed at
  the wrong host.

### Carrying forward
- **Game server deploy** (task #13) — still blocked on Martin.
  `fly launch + fly deploy` per `apps/game-server/DEPLOY.md`, then
  set `NEXT_PUBLIC_GAME_SERVER_URL=wss://<app>.fly.dev` on Vercel.
  Prod `/world` is single-player until done.
- **Wire more creators to ART19 shows** — only 1 of 53 currently
  linked. Without this, ~52 creators see "Show performance: Not
  connected" on their Studio dashboard.
- **Brand-side dashboard data** — needs `brand_id` on
  `art19_campaigns` OR a name-based join.
- **Mike's card spec fields** (memo:
  `project_marketplace_dashboard.md`) — brand budget, creator slot
  count, CPM per slot, etc.
- **"Initiate match" CTA** on the marketplace deck.

## Memory check

No new memos needed today. Today was mostly stabilization +
visual polish + the deploy story. The yesterday memos
(`project_marketplace_dashboard.md`, `project_world_character_card.md`)
still hold for future work.

## Closeout

11 commits since yesterday's session log (`656a757`):

```
5dacfb6  fix(studio): registration works when email confirmation is enabled
efdb328  fix(rq-quiz): give 'research behind' panel a discrete background
fe5c5da  feat(rq-quiz): swap brandmark for RQ wordmark + intro CTA → "Start"
53cad19  fix(xq-quiz): widen intro container to remove vertical scroll
13dfca0  feat(xq-quiz): RQ yellow→magenta sunset palette + 10% smaller in-card marks
253ce06  docs(vercel): full env var inventory + Studio onboarding callout
df9d3bd  fix(studio,admin): mark auth-gated pages as force-dynamic
46f784a  fix(admin,design-system): solid alerts popover bg + working light theme
50d6640  feat(admin): wire Pages overview into sidebar
f078be7  fix(studio): split studio-auth into server + client entry points
7a883a3  revert(admin): undo /admin -> /hq rename
```

Plus today's session log (this file).

Studio is now actually accessible at `ghostsignal.cloud/studio`.
Registration flow is end-to-end pending the final Resend smoke test.
Tomorrow's call.
