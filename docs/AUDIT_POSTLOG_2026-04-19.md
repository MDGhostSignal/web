# Audit Post-Log — 2026-04-19

Companion to `AUDIT_PRELOG_2026-04-19.md`. Records what the audit
actually changed and the final state of the codebase.

## Restore points

| Tag | Purpose | Commit |
|-----|---------|--------|
| `pre-audit-2026-04-19` | State **before** any audit change | `9354b11` |
| `post-audit-2026-04-19` | Final state | this commit |

Rollback: `git reset --hard pre-audit-2026-04-19`.

## Validation — before vs. after

| Check | Baseline (pre) | Final (post) |
|-------|----------------|--------------|
| `npm run typecheck` | ✅ pass | ✅ pass |
| `npm run lint` | ❌ 3 errors / 9 warnings | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 47 assets | ✅ 43 assets |
| `npm run build` | ✅ 22 static pages | ✅ 21 static pages (home-future gone) |
| `.next/static` size | ~3.3 MB | ~2.4 MB (−27 %) |
| Lottie JSON on initial page chunk | ~940 KB bundled | 0 KB (fetched lazily) |
| Inter font fetches | 2× (duplicate) | 1× |
| External-CDN runtime calls | 3 (unpkg × 3) | 0 |
| Home hero video preload | `auto` (~25 MB) | `metadata` (~tens of KB) |
| Home hero video size | 25 MB (H.264 @ 10 Mbps) | 1.7 MB WebM / 3 MB MP4 (−93 % / −88 %) |
| Image formats served | WebP | **AVIF + WebP** |
| CSS module total LOC | ~9,705 | ~8,140 (−16 %) |
| npm packages installed | baseline | **−72 packages** |
| Largest source file | `rq-quiz/page.tsx` 960 LOC | 660 LOC (split into 3 files) |
| Duplicated `navLinks` copies | 6 | 1 (shared) |
| WebGL-setup boilerplate copies | 6 | 0 (+1 helper module) |
| Sitemap routes | 1 (homepage only) | 8 public routes |
| Pages with per-page metadata | 3 | all 7 public pages |
| TypeScript `any` usages | — | 0 |

## Commits (in order)

| Commit | What it does |
|--------|--------------|
| `9354b11` | Pre-audit restore point + `test-email.mjs` sanitized |
| `85cc28e` | `AUDIT_INVENTORY.md` (read-only) |
| `5f179a0` | Delete dead code + 10 unused npm deps |
| `b8abc22` | Fix all ESLint errors / warnings |
| `9f18d03` | Extract email templates out of `api/rq-submissions/route.ts` |
| `62ad440` | Load Inter once; self-host Earth texture |
| `d25aeef` | Lazy-fetch Lottie JSON (~940 KB out of initial bundle) |
| `8401559` | First post-log (superseded by this file) |
| `6a1e5c4` | Dynamic-import heavy WebGL backgrounds |
| `3ab7660` | Self-host the Spline viewer script |
| `aab6caa` | Prune 235 orphaned rules from page-level CSS modules |
| `e16f304` | Prune orphaned mobile-menu rules from SiteHeader |
| `1db933f` | Extend pruner to global CSS; drop 3 stale rq-quiz rules |
| `20a5b85` | Extract ResultsScreen from rq-quiz/page.tsx (982 → 742 LOC) |
| `ea05d1f` | Extract IntroStep (742 → 660 LOC) |
| `c132fd6` | Extract duplicated `navLinks` into a single shared module |
| `4125ff3` | Extract WebGL fullscreen-shader boilerplate into `lib/webgl.ts`; migrate 4 components |
| `179ffef` | Enable AVIF + 1-week cache TTL; add `sizes` to hero `<Image fill>` |
| `c0058d0` | Complete sitemap + per-page metadata + OG defaults |
| `e0915b2` | Change home hero video `preload` from `"auto"` to `"metadata"` |
| `8f8d33d` | A11y: global reduced-motion fallback, founders modal dialog semantics, radio fieldset |
| `27268e9` | Transcode hero video — 25 MB → 1.7 MB WebM + 3 MB MP4 fallback |

## What was removed

### Dead files (zero inbound imports)

- `src/app/home-future/` — parked alternate homepage (page + 939-LOC CSS).
- `src/app/rq-quiz/VolumetricFog.tsx` (482 LOC).
- `src/app/rq-quiz/LiquidBackground.tsx` (596 LOC).
- `src/app/rq-quiz/rq-index-old.css`.
- `src/components/SpinningLogo3D.tsx` + module.
- `src/components/GhostSignalLiquidWordmark.tsx` (710 LOC — only used
  by home-future).
- `src/motion/RotateOnScroll.tsx`, `AccordionHeight.tsx`,
  `SmoothScrollLenis.tsx`, `ScrollGrowToContainer.tsx`,
  `ScrollGrowDockPin.tsx`.

Net: **~5,000 LOC of dead source** removed from `apps/web/src/`.
Updated `AGENTS.md` and `docs/MOTTO_MOTION_LIBRARY.md` so their
component tables match what actually exists.

### Dead npm dependencies

`three`, `@react-three/fiber`, `@react-three/drei`,
`@react-three/postprocessing`, `postprocessing`,
`@splinetool/react-spline`, `class-variance-authority`, `clsx`,
`tailwind-merge`, `lenis`. 72 transitive packages also dropped.

Key discovery: `EarthGlobe` and `ScrollScenes` use hand-written WebGL
shaders (not three.js), and `SplineEmbed` loads the Spline viewer as a
Web-Component script (not via the React wrapper). The declared stack
and the actual runtime stack had drifted apart.

### Orphaned CSS

247 rules removed across 7 CSS modules. Most were left-over footer
styling (after `Footer.tsx` was extracted) and a legacy mobile-menu
that no longer exists in `SiteHeader.tsx`. Added
`apps/web/scripts/prune-unused-css.mjs` as a repeatable tool; it's
conservative (only removes rules whose selector list references only
unused locally-defined classes, never touches `@keyframes`, tag
selectors, or selectors chaining into unknown/external classes).

## What was refactored

### 1. Email templates extracted

`src/app/api/rq-submissions/route.ts` went from **921 → 238 LOC** by
moving `sendUserSummaryEmail`, `sendNotificationEmail`, and the
`escapeHtml` helper into `emails.ts` in the same folder. Byte-for-byte
identical output — pure move, no rewrite of the HTML.

### 2. Font loading — Inter loaded once

`app/layout.tsx` was instantiating `Inter()` twice with identical
subsets and weights. Consolidated into one call and updated the two
places in CSS (`globals.css`, `tokens.css`) where `--font-display`
aliased a now-redundant `--font-heading` variable. Added
`display: "swap"` so paint isn't blocked on the font fetch.

### 3. Earth texture self-hosted

`EarthGlobe.tsx` and `ScrollScenes.tsx` pulled the topology PNG from
`unpkg.com/three-globe` at runtime. Copied the 378 KB PNG into
`public/images/globe/` and updated both components to use the local
path — removes a third-party CDN dependency with no SRI.

### 4. Spline viewer self-hosted

`SplineEmbed.tsx` loaded `@splinetool/viewer@1.12.79/build/spline-viewer.js`
from `unpkg.com` via `<Script strategy="lazyOnload">`. Pinned that
version into `public/vendor/spline/spline-viewer-1.12.79.js` (2.2 MB)
and switched the src. Still lazy-loaded, but now served from our own
origin with normal caching.

### 5. Lottie JSON lazy-fetched

`/for-creators` and `/for-advertisers` each imported a ~470 KB Lottie
JSON at build time, baking the entire animation payload into that
route's initial JS chunk. Added a small `components/LazyLottie.tsx`
that fetches the JSON on mount, and wired both pages to use it.
~940 KB moves out of the initial bundle into a lazy, cacheable fetch.

### 6. Dynamic-imported heavy WebGL backgrounds

Added `next/dynamic` (`ssr: false`) for purely-decorative WebGL
canvases so they don't sit in each route's initial chunk:

| Route | Deferred components |
|-------|---------------------|
| `/` | `FogOverlay` |
| `/for-advertisers` | `StarFogBackground` |
| `/what-is-this` | `ScrollScenes` (also transitively defers `EarthGlobe`) |
| `/rq-quiz` | `SimpleFog`, `DesertFog`, `SnowAnimation` |

`ssr: false` is safe here — none of these components contain
SEO-relevant content; they're fullscreen animated backgrounds.

### 7. Lint debt cleared

All 3 errors and 9 warnings resolved. Notable:

- `FoundersSection.tsx` body-overflow lock moved out of click handlers
  into a `useEffect`, satisfying React Compiler immutability and
  restoring the previous overflow value on unmount.
- `rq-quiz/page.tsx` keyboard listener rewritten to bind once and read
  the latest callbacks through refs instead of rebinding per render.
- Three raw `<img>` tags converted to `next/image` with appropriate
  `unoptimized` / `priority` flags.
- ESLint now globally ignores `public/**` — with the self-hosted
  Spline viewer landing there, linting 2.2 MB of minified JS produced
  5 000+ junk warnings.

## Extended optimization phase (addressed after first post-log)

- **rq-quiz/page.tsx decomposed.** 982 → 660 LOC. The results screen
  moved to `ResultsScreen.tsx` (337 LOC), the welcome / research
  screen to `IntroStep.tsx` (123 LOC). Inside ResultsScreen, the three
  near-identical "Axis 1/2/3" blocks collapsed into one
  `<AxisExplanation>` driven by a three-entry `AXES` config, so the
  axis template now lives exactly once. Behaviour preserved.
- **`rq-quiz.css` global pruner.** Extended
  `scripts/prune-unused-css.mjs` with a `mode: "global"` for plain CSS
  (kebab-case classes referenced via `className="…"`). It recognises
  string-literal, ={"…"}, and template-literal class attributes, and
  accepts per-target `assumeUsedPrefixes` for dynamic patterns (e.g.
  `rq-axis-*`, `rq-clarity-*`). After all that care, only 3 rules
  were genuinely dead (stale @media overrides for removed elements);
  those were removed.
- **Duplicate `navLinks` unified.** The identical 9-line nav array
  was copy-pasted into all six public page files. Moved to
  `src/lib/nav.ts`; 60 → 17 LOC across seven files.
- **WebGL boilerplate helper.** Each decorative WebGL background was
  hand-rolling ~80 LOC of shader compile / program link / quad buffer
  / resize / rAF / cleanup. Extracted to
  `src/lib/webgl.ts::startFullscreenShader` and migrated
  `FogOverlay`, `DesertFog`, `SimpleFog`, `StarFogBackground` (1,211
  → 829 LOC in the components). `EarthGlobe` and `ScrollScenes` stay
  on their bespoke implementations — textures, multi-uniform,
  scroll-driven state made the payoff-to-risk less clear there.
- **SEO repaired.** `sitemap.ts` only listed the homepage; expanded
  to all seven public routes with proper `changeFrequency` /
  `priority`. Root `layout.tsx` got a real value-prop description,
  a `title.template` so every page gets "| GhostSignal" for free,
  and OG / Twitter defaults. Added `layout.tsx` metadata for
  `/for-creators`, `/what-is-this`, `/get-in-touch`, `/rq-quiz`.
- **Image optimizer config.** Enabled AVIF + WebP in `next.config.ts`
  (AVIF is 30-50 % smaller than WebP for photos), raised
  `minimumCacheTTL` to a week, and added `sizes` to the only
  `<Image fill>` so it stops generating unused srcset widths.
- **Hero video preload fix.** The 25 MB home-hero MP4 was loading
  with `preload="auto"`, dragging the whole file onto the initial
  page load. Switched to `preload="metadata"` — the browser now
  fetches just enough to start autoplay, nothing else.

## What was **not** touched (still flagged)

- **`EarthGlobe.tsx` and `ScrollScenes.tsx`** were not migrated to
  `startFullscreenShader` because they layer texture loading,
  mouse/scroll state, and velocity/friction on top of the base WebGL
  pattern. The savings would be smaller and the regression surface
  larger.
- **CSS modules using dynamic `styles[`key_${x}`]`** (`design-tasks`,
  `TaskDetailPanel`, `BrandedGhostSignal`) were intentionally excluded
  from the pruner — the tool doesn't model template-literal class
  access and would produce false positives there.
- **Large media in `public/`** — `desktopblankcloud2.mp4` (25 MB) and
  a few raster PNGs/JPGs over 2 MB each are the biggest files shipped.
  Converting to WebP / re-encoding the video would be a real perf win
  but needs tooling (sharp, ffmpeg) and visual sign-off; out of scope
  for this audit.
- **Route renaming** (`for-advertisers`, `get-in-touch`) left alone
  per your instruction; those pages stand as-is.

## Accessibility pass (round 4)

One final, targeted a11y pass — only things that ship user-visible
improvements:

- **Reduced-motion fallback in `globals.css`** — a single
  `prefers-reduced-motion: reduce` block that zeroes out animation and
  transition durations across the whole app. The WebGL canvases
  already honour the preference via `startFullscreenShader`'s
  `respectReducedMotion`; this catches the CSS keyframes and
  GSAP-driven motion that weren't gated.
- **Founders modal** (`/who-are-we`) now behaves like a real dialog:
  `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing
  at the founder's name (which got an id), Escape key closes it,
  and the close button auto-focuses on open so keyboard users aren't
  stranded on the card behind it. The inner portrait `<Image>` drops
  its redundant name-as-alt (the dialog label already provides it)
  and the close icon's `<svg>` is marked `aria-hidden`.
- **"Podcast or Advertiser?" radio group** on `/get-in-touch` is now
  a real `<fieldset>` with `<legend>` instead of a `<span>` over two
  radios. Screen readers now announce the group label with each
  choice automatically.

## What's intentionally *not* in this audit

After weighing reward-to-risk, a few flagged items were explicitly
left alone:

- **`EarthGlobe` / `ScrollScenes` WebGL helper migration.** They layer
  textures, mouse state, and scroll-driven uniforms on top of the base
  pattern; savings are small (~100 LOC) and regression surface large.
- **Lossless PNG/JPG re-encoding.** `next/image` already transcodes
  everything to AVIF+WebP at request time, so users never see the
  originals. Optimising source files would save repo bytes only.
- **Hero video transcode — done in-place.** Used a temporary install
  of `ffmpeg-static` (via `--no-save`, so it isn't in `package.json`)
  to produce a 1.7 MB VP9 WebM and a 3 MB H.264 MP4 fallback. The
  `<video>` element now lists them as two `<source>` tags so browsers
  pick the format they can decode. Original 25 MB MP4 deleted from
  the working tree; recoverable from git history if ever needed.

## Outstanding action on your side

- **Rotate the Resend API key.** `apps/web/test-email.mjs` once held a
  hard-coded key (`re_efqvYHZ7…`). The sanitized script is committed;
  the key was never pushed to GitHub (verified with `git log -S`), but
  because it sat in a plaintext working-tree file it should be
  rotated at `https://resend.com/api-keys`.
- **Dev-server walkthrough** across every page to confirm no visual
  regression. The audit did not run a browser walkthrough.

---

End of post-log. All checks green. Every change is isolated in its
own commit and the `pre-audit-2026-04-19` tag is still the one-command
rollback.
