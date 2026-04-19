# Audit Post-Log — 2026-04-19

Companion to `AUDIT_PRELOG_2026-04-19.md`. Records what the audit actually
changed and the final state of the codebase.

## Restore points

| Tag | Purpose | Commit |
|-----|---------|--------|
| `pre-audit-2026-04-19` | State **before** any audit change | `9354b11` |
| *(post-log commit)* | State **after** the audit | this commit |

Rollback: `git reset --hard pre-audit-2026-04-19`.

## Validation — before vs. after

| Check | Baseline (pre) | Final (post) |
|-------|----------------|--------------|
| `npm run typecheck` | ✅ pass | ✅ pass |
| `npm run lint` | ❌ 3 errors / 9 warnings | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 47 assets | ✅ 41 assets |
| `npm run build` | ✅ 22 static pages | ✅ 21 static pages (home-future gone) |
| `.next/static` size | ~3.3 MB | **~2.3 MB (-30%)** |
| npm packages installed | (baseline) | **–72 packages** |

## Commits (in order)

| Commit | What it does |
|--------|--------------|
| `9354b11` | Restore point + `test-email.mjs` sanitised (Resend key removed from working tree) |
| `85cc28e` | `docs/AUDIT_INVENTORY.md` — read-only repo map |
| `5f179a0` | Delete dead code + 10 unused npm deps |
| `b8abc22` | Fix all ESLint errors / warnings |
| `9f18d03` | Extract email templates out of `api/rq-submissions/route.ts` |
| `62ad440` | Load Inter once; self-host Earth topology texture |
| `d25aeef` | Lazy-fetch Lottie JSON (~940 KB out of initial bundle) |

## What was removed

### Dead files (no inbound imports)

- `src/app/home-future/` — parked alternate homepage (page + 939-LOC CSS).
- `src/app/rq-quiz/VolumetricFog.tsx` (482 LOC).
- `src/app/rq-quiz/LiquidBackground.tsx` (596 LOC).
- `src/app/rq-quiz/rq-index-old.css`.
- `src/components/SpinningLogo3D.tsx` + module.
- `src/components/GhostSignalLiquidWordmark.tsx` (710 LOC — only used by
  home-future).
- `src/motion/RotateOnScroll.tsx`, `AccordionHeight.tsx`,
  `SmoothScrollLenis.tsx`, `ScrollGrowToContainer.tsx`,
  `ScrollGrowDockPin.tsx`.

Net: **~5,000 LOC of dead source** removed from `apps/web/src/`. Updated
`AGENTS.md` and `docs/MOTTO_MOTION_LIBRARY.md` so their component tables
match what actually exists.

### Dead npm dependencies (zero imports found via grep)

`three`, `@react-three/fiber`, `@react-three/drei`,
`@react-three/postprocessing`, `postprocessing`,
`@splinetool/react-spline`, `class-variance-authority`, `clsx`,
`tailwind-merge`, `lenis`. 72 transitive packages also removed.

The surprise here: `EarthGlobe` and `ScrollScenes` use **hand-written
WebGL shaders**, not three.js. And `SplineEmbed` loads the Spline viewer
as a `<Script>`-based web component, not via the React wrapper. So the
advertised stack and the actual runtime stack had drifted.

## What was refactored

### 1. Email templates extracted

`src/app/api/rq-submissions/route.ts` went from **921 → 238 LOC** by
moving `sendUserSummaryEmail`, `sendNotificationEmail`, and the `escapeHtml`
helper into `emails.ts` in the same folder. Byte-for-byte identical
output — pure move, no rewrite of the HTML itself.

### 2. Font loading — Inter loaded once

`app/layout.tsx` was calling `Inter()` twice (once for `--font-heading`,
once for `--font-body`) with identical subsets and weights. Consolidated
into a single call and updated `globals.css` + `tokens.css` so
`--font-display` aliases `--font-body` directly. Also added
`display: "swap"` so rendering isn't blocked by the font fetch.

### 3. Earth texture self-hosted

`EarthGlobe.tsx` and `ScrollScenes.tsx` were fetching the Earth-topology
PNG from `unpkg.com/three-globe@2.31.0/…` at runtime — a live third-party
CDN dependency with no SRI. Copied the 378 KB PNG into
`public/images/globe/` and pointed both components at the local path.

### 4. Lottie JSON lazy-fetched

`/for-creators` and `/for-advertisers` each had `import creators.json`
(470 KB each) baked into the route's client chunk. Added a tiny
`components/LazyLottie.tsx` that fetches the JSON on mount, and wired
both pages to use it. ~940 KB of JSON moves out of the initial bundle
into a cacheable runtime fetch.

### 5. Lint debt cleared

All 3 errors and 9 warnings resolved — see commit `b8abc22` for the
full list. Notable fixes:

- `FoundersSection.tsx` — body-overflow lock moved out of click handlers
  into a `useEffect`, satisfying React Compiler's immutability rule and
  restoring the previous overflow value on unmount.
- `rq-quiz/page.tsx` — keyboard listener rewritten to bind once and read
  the latest callbacks through refs, rather than rebinding on every
  render.
- Three raw `<img>` tags converted to `next/image` with appropriate
  `unoptimized` / `priority` flags.

## What was **not** touched (deferred, flagged for you)

### Big-risk refactors

- **`rq-quiz/page.tsx` is still 960 LOC in one file** — it's a genuinely
  hard state machine (intro, 15 questions, results, email send). Breaking
  it into an `<IntroStep>`, `<QuestionStep>`, `<ResultsScreen>` trio
  would be valuable but needs deliberate planning; not worth doing
  mid-audit without a clear regression plan.
- **`who-are-we/page.module.css` is still 1,578 LOC.** Reading the page
  structure, every wrapper I inspected has a CSS responsibility (absolute
  positioning parents, noise-texture overlays, flex columns, etc.), so
  the file isn't padded — it's doing real work. A proper CSS audit would
  need visual coverage, not just a LOC count.
- **`EarthGlobe.tsx` (514 LOC) and `ScrollScenes.tsx` (693 LOC) share a
  lot of shader / loop code.** Unifying them into one WebGL core + two
  thin wrappers is probably a day's work and needs visual verification
  across three pages. Flagged, not done.
- **Spline viewer is still loaded from unpkg** in `SplineEmbed.tsx`.
  Self-hosting means pulling a 1.3 MB+ script and watching for Spline
  version drift. Worth doing; needs a small decision from you first
  (pin version and self-host, or add SRI and keep the CDN link).

### Route naming

Still not touched per your instruction: `/for-advertisers` and
`/get-in-touch` are distinct from `/for-brands` / `/contact` canonical
names in `PROJECT_INFO.md`. If "For Brands" is intended as a separate
page (as you implied), that would be a net new page to design and add,
not a rename.

### Visual QA

The audit did not run a dev-server walkthrough of every page, so I
can't claim "visually identical" with certainty — only that no CSS
selectors or DOM structure changed in the pages themselves. Recommend
one manual pass across: `/`, `/for-creators`, `/for-advertisers`,
`/what-is-this`, `/who-are-we`, `/get-in-touch`, `/snowdrift`,
`/rq-quiz` before you consider the audit closed.

## Security action (reminder)

`apps/web/test-email.mjs` once contained a hard-coded Resend API key
starting with `re_efqvYHZ7…`. The sanitised script is committed; the
key was **never** pushed to GitHub (verified with `git log -S`). But
because the key sat in a plaintext working-tree file and was seen by
this audit session, it should still be rotated at
`https://resend.com/api-keys`.

---

End of post-log. The audit is in a stable state: all checks green,
every change is isolated in its own commit, and the `pre-audit-2026-04-19`
tag is still the one-command rollback.
