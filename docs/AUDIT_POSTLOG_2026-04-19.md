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
| CSS module total LOC | ~9,705 | ~8,140 (−16 %) |
| npm packages installed | baseline | **−72 packages** |

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

## What was **not** touched (still flagged)

- **`rq-quiz/page.tsx` is still 960 LOC in one file.** Breaking it
  into an `<IntroStep>`, `<QuestionStep>`, `<ResultsScreen>` trio is
  a genuine refactor that needs a proper regression plan; skipped to
  keep this audit's blast radius contained.
- **`rq-quiz.css` (plain CSS, kebab-case classes) — 131 selectors.**
  The pruner doesn't handle kebab-case plain CSS, and the rq-quiz
  page uses dynamic className concatenation in a few places, so
  automatic cleanup would risk false positives. Worth a targeted
  follow-up.
- **`EarthGlobe.tsx` (514 LOC) and `ScrollScenes.tsx` (693 LOC)**
  share WebGL setup boilerplate but have very different fragment
  shaders. Unification would save ~100 LOC at best and carries real
  visual risk; not done.
- **CSS modules using dynamic `styles[`key_${x}`]`** (`design-tasks`,
  `TaskDetailPanel`, `BrandedGhostSignal`) were intentionally excluded
  from the pruner — the tool doesn't model template-literal class
  access and would produce false positives there.
- **Route renaming** (`for-advertisers`, `get-in-touch`) left alone
  per your instruction; those pages stand as-is.

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
