# Audit Inventory — 2026-04-19

Read-only analysis of the `apps/web/` codebase. No source files modified by
this pass. Feeds the refactor plan in task #4.

## Baseline validation (current `main`, commit 9354b11)

| Check | Result | Notes |
|-------|--------|-------|
| `npm run tokens:build` | ✅ pass | 47/47, 89 numbers, 50 font, 249 tw, 660 spacing |
| `npm run typecheck` | ✅ pass | 0 errors |
| `npm run assets:audit` | ✅ pass | 47 referenced assets all present |
| `npm run build` | ✅ pass | Next 16.1.6 / Turbopack, 22 static pages, 5.7s compile |
| `npm run lint` | ⚠️ **3 errors, 9 warnings** | see below |

### Lint issues to fix (all small, safe wins)

**Errors (3)**
- `src/app/api/design-tasks/route.ts:132` — `commentCounts` should be `const`
- `src/app/api/design-tasks/route.ts:133` — `latestCommentAt` should be `const`
- `src/app/who-are-we/FoundersSection.tsx:54` — `document.body.style.overflow = "hidden"` outside an effect; React Compiler strict rule. Fix: move the body-lock into a `useEffect` gated on `selectedFounder`.

**Warnings (9)**
- `src/app/api/rq-chart/route.tsx:48-50` — three unused `*LabelPos` vars.
- `src/app/rq-quiz/page.tsx:435` — `useEffect` missing `canProceed` / `handleNext` deps.
- `src/app/rq-quiz/page.tsx:524` — `data` assigned but never used.
- `src/app/rq-quiz/page.tsx:791,806,852` — three `<img>` tags should use `next/image`.
- `src/app/snowdrift/page.tsx:2` — unused `Link` import.

### Bundle baseline (`apps/web/.next/static`)

Total static output: **3.3 MB**. Next 16 + Turbopack did not print per-route
First Load JS in this run — the performance pass (task #5) will produce
per-route numbers using `ANALYZE=true` or manual chunk inspection.

---

## Routes (12 total)

| Route | Page file LOC | CSS module LOC | Status |
|-------|-------|-------|------|
| `/` | 79 | 243 | ✅ canonical — clean |
| `/for-creators` | 334 | 910 | ✅ canonical |
| `/for-advertisers` | 334 | 933 | ✅ canonical (naming drift vs. "For Brands") |
| `/what-is-this` | 303 | 871 | ✅ canonical |
| `/who-are-we` | 334 | 1,578 ⚠️ | ✅ canonical — biggest CSS file in repo |
| `/get-in-touch` | — | 643 | ✅ canonical (naming drift vs. "Contact") |
| `/snowdrift` | — | 651 | ✅ canonical |
| `/rq-quiz` | 960 ⚠️ | — | feature (quiz) |
| `/rq-dashboard` | — | — | internal |
| `/design-tasks` | 613 | 805 | internal |
| `/design-system` | 468 | 691 | internal / token reference |
| `/home-future` | — | 939 | 🟥 **parked duplicate homepage — recommend delete** |

### API routes

- `api/contact/route.ts`
- `api/design-tasks/route.ts` (342 LOC)
- `api/design-tasks/comments/route.ts` (268 LOC)
- `api/rq-chart/route.tsx` — uses `@vercel/og`
- `api/rq-submissions/route.ts` (921 LOC) — **has large inline email-HTML template that should be extracted**
- `api/rq-submissions/list/route.ts`

---

## Component inventory

### Shared components under `src/components/`

| Component | LOC | Used by | Verdict |
|-----------|-----|---------|---------|
| `SiteHeader` | — | `/`, `/for-creators`, `/for-advertisers`, `/what-is-this`, `/who-are-we`, `/snowdrift` | core — keep |
| `Footer` | — | all public pages | core — keep |
| `ContactSection` | — | `/for-creators`, `/for-advertisers`, `/who-are-we` | core — keep |
| `ParallaxBackground` | — | `/for-creators`, `/for-advertisers`, `/what-is-this` | core — keep |
| `BrandedGhostSignal` | — | `/what-is-this` (2x) | single-use, cheap — keep |
| `EarthGlobe` | 514 | `/what-is-this` (via `ScrollScenes`) | heavy — see ScrollScenes |
| `ScrollScenes` | 693 | `/what-is-this` | heavy — **wraps EarthGlobe — likely some overlap between these two files** |
| `GhostSignalLiquidWordmark` | 710 | `/home-future` only | 🟥 **dead if home-future is deleted** |
| `SpinningLogo3D` + module | — | **nothing** | 🟥 **dead code** |
| `rq/ChoiceQuestion` | — | `/rq-quiz` | keep |
| `rq/ScaleQuestion` | — | `/rq-quiz` | keep |
| `rq/TextInput` | — | `/rq-quiz` | keep |
| `rq/TextArea` | — | `/rq-quiz` | keep |
| `rq/MorseProgress` | — | `/rq-quiz` | keep |
| `rq/RQResultsGraph` | — | `/rq-quiz` | keep |
| `rq/RQRadarChart` | — | (need to verify) | check |

### Per-route local components

| File | LOC | Used by |
|------|-----|---------|
| `app/FogOverlay.tsx` | 282 | `/` |
| `app/rq-quiz/DesertFog.tsx` | 107 | `/rq-quiz` |
| `app/rq-quiz/SimpleFog.tsx` | 385 | `/rq-quiz` |
| `app/rq-quiz/SnowAnimation.tsx` | — | `/rq-quiz` |
| `app/rq-quiz/VolumetricFog.tsx` | 482 | **nothing** 🟥 |
| `app/rq-quiz/LiquidBackground.tsx` | 596 | **nothing** 🟥 |
| `app/rq-quiz/rq-index-old.css` | — | **nothing** 🟥 |
| `app/for-advertisers/StarFogBackground.tsx` | 311 | `/for-advertisers` |
| `app/for-advertisers/layout.tsx` | — | `/for-advertisers` |
| `app/who-are-we/FoundersSection.tsx` | — | `/who-are-we` |
| `app/who-are-we/SplineEmbed.tsx` | 97 | `/who-are-we` |
| `app/design-tasks/TaskDetailPanel.tsx` | 569 | `/design-tasks` |

---

## Motion library usage (`src/motion/`)

Exports in `motion/index.ts` and their usage outside the motion folder:

| Primitive | Used in | Verdict |
|-----------|---------|---------|
| `SplitLinesReveal` | home, what-is-this, who-are-we, for-creators, for-advertisers, snowdrift, get-in-touch, ContactSection | 🟢 core |
| `ScrollFadeUp` | home, what-is-this, who-are-we, for-creators, for-advertisers, snowdrift, get-in-touch, Footer, ContactSection, FoundersSection | 🟢 core |
| `ParallaxY` | for-advertisers | 🟢 keep (single use) |
| `gsap` (raw) | what-is-this, SiteHeader | 🟢 keep |
| `ScrollGrowDockPin` | **home-future only** | 🟥 **dead once home-future is removed** |
| `RotateOnScroll` | **nothing** | 🟥 dead |
| `AccordionHeight` | **nothing** | 🟥 dead |
| `SmoothScrollLenis` | **nothing** | 🟥 dead |
| `ScrollGrowToContainer` | **nothing** | 🟥 dead |

Every page that needs motion-library primitives imports them correctly (no
in-page GSAP rewrites), so the discipline prescribed by `AGENTS.md` is
holding in active code.

---

## Dependency audit — `apps/web/package.json`

Searched every source file for imports of each dep. Findings:

### Likely-unused dependencies (candidates for removal)

| Dependency | Why it looked heavy | Actual usage | Verdict |
|------------|--------------------|--------------|---------|
| `three` (`^0.182.0`) | 3D lib | Never imported. `EarthGlobe` and `ScrollScenes` use hand-written WebGL shaders; they only fetch a texture image from `unpkg.com/three-globe`. | 🟥 remove |
| `@react-three/fiber` | React-Three adapter | Never imported | 🟥 remove |
| `@react-three/drei` | R3F helpers | Never imported | 🟥 remove |
| `@react-three/postprocessing` | R3F postprocessing | Never imported | 🟥 remove |
| `postprocessing` | Underlying pp lib | Never imported | 🟥 remove |
| `@splinetool/react-spline` | Spline React wrapper | Never imported. `SplineEmbed` loads the Spline viewer via `<Script src=unpkg.../spline-viewer.js>` + a custom element | 🟥 remove |
| `class-variance-authority` | Style variants | Never imported | 🟥 remove |
| `clsx` | Class-joining | Never imported | 🟥 remove |
| `tailwind-merge` | Tailwind class merge | Never imported | 🟥 remove |
| `lenis` | Smooth scroll | Only imported by `SmoothScrollLenis`, which is itself unused | 🟥 remove with SmoothScrollLenis |

Removing these nine packages will materially cut `node_modules`, `npm install`
time, and the lockfile. They won't change the shipped bundle (tree-shaking
already excludes them), but they stop shipping the *illusion* of a stack
that isn't really there.

### Used dependencies (keep)

| Dependency | Used in |
|------------|---------|
| `next`, `react`, `react-dom` | everywhere |
| `gsap` | motion library core |
| `split-type` | `SplitLinesReveal` |
| `lottie-react` | `for-creators`, `for-advertisers` |
| `@vercel/og` | `api/rq-chart/route.tsx` |
| `motion` | Only `MotionConfig` in `providers.tsx`. Trivial to keep, but if bundle turns out to include the whole Motion library just for this wrapper, we'll switch to native CSS transitions. (To confirm in perf pass.) |

---

## External-CDN dependencies (fragile — worth flagging)

Three places pull a live asset from `unpkg.com` at runtime. This is a
reliability/supply-chain concern and a rendering-cold-start concern.

- `components/EarthGlobe.tsx:318` — `https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png`
- `components/ScrollScenes.tsx:489` — same URL
- `app/who-are-we/SplineEmbed.tsx:85` — `https://unpkg.com/@splinetool/viewer@1.12.79/build/spline-viewer.js`

Recommendation: copy `earth-topology.png` into `public/images/globe/` and
self-host the Spline viewer script (or accept the tradeoff explicitly with
an `integrity` SRI hash). Flagged for the refactor phase.

---

## CSS inventory (17 modules, 9,705 LOC total)

| File | LOC | Notes |
|------|-----|-------|
| `who-are-we/page.module.css` | **1,578** | Biggest file in the repo. Probable refactor candidate. |
| `home-future/page.module.css` | 939 | Dies with home-future. |
| `for-advertisers/page.module.css` | 933 | |
| `for-creators/page.module.css` | 910 | |
| `what-is-this/page.module.css` | 871 | |
| `design-tasks/page.module.css` | 805 | internal tool |
| `design-tasks/TaskDetailPanel.module.css` | 708 | internal tool |
| `design-system/design-system.module.css` | 691 | internal reference |
| `snowdrift/page.module.css` | 651 | |
| `get-in-touch/page.module.css` | 643 | |
| `app/page.module.css` | 243 | homepage — tight |
| `components/Footer.module.css` | 206 | |
| `components/SiteHeader.module.css` | 182 | |
| `components/ContactSection/ContactSection.module.css` | 157 | |
| `BrandedGhostSignal.module.css` | — | |
| `ParallaxBackground.module.css` | — | |
| `SpinningLogo3D.module.css` | — | 🟥 dead with SpinningLogo3D |

Global CSS (`globals.css`, `generated-tokens.css`, `typography.css`,
`tokens.css`) is kept in `src/styles/` and loaded from `layout.tsx`.
`generated-tokens.css` (1,181 LOC) is build-generated and off-limits.

---

## Div-density per page (rough signal for "container sickness")

Counting top-level `<div` occurrences in each page (not depth, just count
— a rough smoke signal; the real audit will read layout by layout).

| Page | Top-level `<div`s | Sanity |
|------|-------------------|--------|
| `snowdrift` | 5 | low |
| `/` (home) | 2 | low |
| `for-advertisers` | 13 | medium |
| `get-in-touch` | 16 | medium |
| `for-creators` | 18 | medium/high |
| `what-is-this` | 19 | medium/high |
| `who-are-we` | 22 | high — also has the biggest CSS module |

High div counts **don't automatically mean "container sickness"** — some
motion primitives need a wrapping `<div>`. The smell pass (task #3) will
read each section and mark specific wrapper chains that collapse.

---

## Initial dead-code / cleanup list (to confirm before deleting)

Straight-up safe deletes (zero inbound references):

1. `src/app/rq-quiz/VolumetricFog.tsx` — 482 LOC, never imported.
2. `src/app/rq-quiz/LiquidBackground.tsx` — 596 LOC, never imported.
3. `src/app/rq-quiz/rq-index-old.css` — never referenced.
4. `src/components/SpinningLogo3D.tsx` + `SpinningLogo3D.module.css` — never imported.

Conditionally-safe deletes (require the call from the user):

5. `src/app/home-future/page.tsx` + `page.module.css` — parked alternate
   homepage, not linked from the site nor the sitemap's canonical routes.
   Once deleted:
   - `src/components/GhostSignalLiquidWordmark.tsx` (710 LOC) → dead,
     delete.
   - `src/motion/ScrollGrowDockPin.tsx` → unused, delete (cascading).
6. Motion primitives never used anywhere:
   `RotateOnScroll.tsx`, `AccordionHeight.tsx`, `SmoothScrollLenis.tsx`,
   `ScrollGrowToContainer.tsx` — delete, and drop their exports from
   `motion/index.ts`. Drops `lenis` dependency.
7. `package.json` deps never imported:
   `three`, `@react-three/fiber`, `@react-three/drei`,
   `@react-three/postprocessing`, `postprocessing`,
   `@splinetool/react-spline`, `class-variance-authority`, `clsx`,
   `tailwind-merge`, `lenis`. Remove from `dependencies`.

---

## Things that need a judgment call (will ask the user)

- **Route renames** per `PROJECT_INFO.md` (`for-advertisers` → `for-brands`,
  `get-in-touch` → `contact`): high-risk (sitemap, external links, past
  session logs, possibly linked in marketing). Default: **don't rename**
  without explicit user go-ahead.
- **Deleting `home-future`**: it's code, not a deployed page linked by the
  header. But it *is* statically generated by Next (`/home-future` shows
  up in the prod route table), so anyone with the URL could reach it.
  Default recommendation: delete.
- **Extracting the email template** from `api/rq-submissions/route.ts`
  into its own module: mechanical refactor, no behavior change. Default:
  do it — it drops that route from 921 LOC to something manageable.

---

## Next: smell-detection pass

With this inventory, task #3 will read each page's section layout and
produce a list of concrete edits (wrapper collapses, Fragment cleanups,
repeated section shells → single `<Section>` wrapper, hardcoded values
→ tokens). That pass is still read-only — no code changes until the user
approves the plan in task #4.
