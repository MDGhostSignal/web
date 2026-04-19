# Session Log — 2026-04-19

Full-codebase audit + optimization pass on `apps/web/`. 26 commits
between the `pre-audit-2026-04-19` and `post-audit-2026-04-19` tags,
plus a first installment of the design-system primitives library
(one post-audit commit) and a push to `origin/main`.

## Outcomes

### Removed
- Dead files (~5,000 LOC): `home-future/`, `VolumetricFog.tsx`,
  `LiquidBackground.tsx`, `rq-index-old.css`, `SpinningLogo3D.*`,
  `GhostSignalLiquidWordmark.tsx`, five unused motion primitives
  (`RotateOnScroll`, `AccordionHeight`, `SmoothScrollLenis`,
  `ScrollGrowToContainer`, `ScrollGrowDockPin`).
- Ten unused npm deps (`three`, `@react-three/*`, `postprocessing`,
  `@splinetool/react-spline`, `class-variance-authority`, `clsx`,
  `tailwind-merge`, `lenis`) — 72 transitive packages pruned.
- ~250 orphaned CSS rules across 7 modules + `rq-quiz.css`.
- Original 25 MB hero video (replaced by new transcodes).

### Refactored
- `api/rq-submissions/route.ts` 921 → 238 LOC by moving the two send
  functions + `escapeHtml` into a new `emails.ts`.
- `rq-quiz/page.tsx` 982 → 660 LOC by extracting `ResultsScreen.tsx`
  (337 LOC) and `IntroStep.tsx` (123 LOC). Three near-identical axis
  blocks collapsed into one `<AxisExplanation>` driven by data.
- WebGL boilerplate extracted into `lib/webgl.ts::startFullscreenShader`;
  `FogOverlay`, `DesertFog`, `SimpleFog`, `StarFogBackground` migrated.
  `EarthGlobe` / `ScrollScenes` deliberately stay on their bespoke
  implementations.
- Duplicated `navLinks` unified into `lib/nav.ts`.

### Design system — first primitive (post-audit, commit `f831b1d`)
- New `src/components/ui/` folder with a `<Button>` primitive backed
  by `Button.module.css`. Four variants: `primary` (dark uppercase
  pill, replaces the copy-pasted `.primaryButton` on three pages),
  `secondary` (replaces `.pitchCta` on `/for-advertisers`), `pill`
  (homepage style, ready for the `.ctaButton` migration), and
  `ghost`. Polymorphic — renders as `<button>`, `<Link>`, or
  `<a target="_blank">` based on props. Mobile full-width at
  ≤ 420 px is baked in, replacing the per-page media-query overrides
  that used to name each button class.
- Migrated `/for-creators`, `/who-are-we`, `/for-advertisers` to
  use `<Button>`. Net: three duplicated `.primaryButton` rules and
  one `.pitchCta` rule removed, along with their responsive
  overrides. `<Section>`, `<Container>`, `<Card>` primitives were
  deliberately **not** built in this pass — they need a design
  decision on canonical max-widths / card styles before they
  deliver value over what they cost in abstraction.

### Performance
- Hero video transcoded: 25 MB → 1.69 MB WebM (−93 %) + 2.97 MB MP4
  fallback (−88 %). Uses `<source>` tags for per-browser selection.
- Video `preload` downgraded `auto` → `metadata`.
- Lottie JSON (~940 KB) moved out of initial route chunks via new
  `components/LazyLottie.tsx` (runtime fetch).
- Inter font now loads once (was loading twice via duplicate
  `Inter()` calls with identical weights).
- Earth-topology PNG self-hosted from `unpkg.com/three-globe`.
- Spline viewer script self-hosted from
  `unpkg.com/@splinetool/viewer`.
- Four heavy WebGL backgrounds dynamic-imported (`ssr: false`).
- `next.config.ts`: enabled AVIF + WebP, raised `minimumCacheTTL` to
  one week.
- `<Image fill>` on `/what-is-this` now has proper `sizes`.

### SEO / Metadata
- `sitemap.ts` expanded from 1 route (homepage) to all 8 public
  routes with `changeFrequency` / `priority`.
- Root `layout.tsx` gained `title.template`, real description,
  `metadataBase`, OG + Twitter defaults.
- New `layout.tsx` metadata for `/for-creators`, `/what-is-this`,
  `/get-in-touch`, `/rq-quiz`.

### Accessibility
- Global `prefers-reduced-motion: reduce` fallback in `globals.css`
  (catches CSS and GSAP-driven motion not individually gated).
- `/who-are-we` founders modal: `role="dialog"`, `aria-modal`,
  `aria-labelledby`, Escape-to-close, close button auto-focuses on
  open, decorative portrait `alt=""`, close icon `aria-hidden`.
- `/get-in-touch` "Podcast or Advertiser?" radio group converted
  from `<span> + <div>` to real `<fieldset> + <legend>`.

### Lint
- 3 errors + 9 warnings → **0 / 0**.
  - `api/design-tasks/route.ts` — `let` → `const` on two records.
  - `who-are-we/FoundersSection.tsx` — body-overflow lock moved into
    a `useEffect` so React Compiler's immutability rule is satisfied
    and the overflow is restored on unmount.
  - `rq-quiz/page.tsx` — imports consolidated, keyboard-listener
    rewritten to bind once with callback refs, three `<img>` tags
    converted to `next/image` (SVG + GIF use `unoptimized`; brand
    mark gets `priority`).
  - Various unused vars/imports cleaned up.
- ESLint config now globally ignores `public/**` (self-hosted Spline
  viewer was triggering thousands of spurious warnings).

## Files touched (high-level)

| Area | Notable paths |
|------|---------------|
| Dead code deletions | `src/app/home-future/**`, `src/components/GhostSignalLiquidWordmark.tsx`, `src/motion/{Accordion,Rotate,SmoothScroll,ScrollGrow*}*` |
| Email extraction | `src/app/api/rq-submissions/{route,emails}.ts` |
| rq-quiz decomposition | `src/app/rq-quiz/{page,IntroStep,ResultsScreen}.tsx` |
| WebGL helper | `src/lib/webgl.ts` + `FogOverlay`, `DesertFog`, `SimpleFog`, `StarFogBackground` |
| Nav dedup | `src/lib/nav.ts` + all six public pages |
| Lottie lazy | `src/components/LazyLottie.tsx` + for-creators, for-advertisers |
| CSS prune | `scripts/prune-unused-css.mjs` + 7 page modules + SiteHeader |
| Font / CDN | `src/app/layout.tsx`, `src/styles/tokens.css`, `src/app/globals.css`, `EarthGlobe.tsx`, `ScrollScenes.tsx`, `who-are-we/SplineEmbed.tsx` |
| Dynamic imports | `src/app/{page,for-advertisers/page,what-is-this/page,rq-quiz/page}.tsx` |
| SEO | `src/app/{sitemap,layout}.tsx` + four new `layout.tsx` |
| A11y | `src/app/globals.css`, `who-are-we/FoundersSection.tsx`, `get-in-touch/page.tsx` |
| Video | `public/images/home/desktopblankcloud2.{webm,mp4}` (+ deleted original), `src/app/page.tsx` |
| Docs | `docs/{AUDIT_PRELOG,AUDIT_INVENTORY,AUDIT_POSTLOG}_2026-04-19.md`, `AGENTS.md`, `apps/web/docs/MOTTO_MOTION_LIBRARY.md` |
| Tooling | `apps/web/package.json`, `apps/web/package-lock.json`, `apps/web/next.config.ts`, `apps/web/eslint.config.mjs` |

## Validation (final state)

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 44 assets resolved |
| `npm run build` | ✅ 21 static pages, Next 16.1.6 / Turbopack |
| Manual dev-server walkthrough | ✅ user confirmed "all looks good" |

## Bundle / size deltas

| | Pre-audit | Post-audit |
|---|---|---|
| `.next/static` | ~3.3 MB | ~2.4 MB (−27 %) |
| Hero video (Chrome/Edge/FF) | 25 MB | 1.69 MB (−93 %) |
| Hero video (Safari) | 25 MB | 2.97 MB (−88 %) |
| Lottie on initial chunk | ~940 KB | 0 (lazy) |
| External unpkg calls | 3 | 0 |
| CSS module total LOC | ~9,705 | ~8,140 (−16 %) |
| npm packages installed | baseline | −72 |
| Lint | 3 errors / 9 warnings | 0 / 0 |
| Pages with per-page metadata | 3 | all 7 |

## Restore points

- `pre-audit-2026-04-19` (commit `9354b11`) — rollback target.
- `post-audit-2026-04-19` (commit `d758c59`) — end of the audit phase.
- `origin/main` — 28 audit commits + session log + `<Button>` primitive
  all pushed (`9d50c83` then `f831b1d`). `main` now tracks
  `origin/main`; previously it tracked the abandoned `old-origin/main`
  (`MDDMUC/ghostsignal`), which is 174 commits behind and not being
  pushed to anymore.

Roll back everything: `git reset --hard pre-audit-2026-04-19`.

## Open items for the user

- **Rotate the Resend API key** at `https://resend.com/api-keys`. The
  leaked key that was in `apps/web/test-email.mjs` has never been
  pushed to git (verified with `git log -S`), but it did live in a
  plaintext working-tree file and has been sent to this audit's
  conversation context.
- On next clean `npm install`, `ffmpeg-static` (installed with
  `--no-save` to do the video transcode, already pruned from
  `node_modules`) will be fully gone.

## Next-step notes

- **Route-naming drift vs. `PROJECT_INFO.md`.** `for-advertisers`
  vs. canonical "For Brands" and `get-in-touch` vs. canonical
  "Contact" were left untouched per explicit user direction; flagged
  in the post-log in case the naming is revisited.
- **`EarthGlobe.tsx` / `ScrollScenes.tsx`** not migrated onto
  `startFullscreenShader` — they layer textures, mouse state, and
  scroll-driven uniforms on top of the base pattern, and the payoff
  is small (~100 LOC) for the regression surface. Worth revisiting
  only if a future change forces work in that area.
- **`rq-quiz.css`** has a large `assumeUsedPrefixes` whitelist in
  the pruner (`rq-clarity-*`, `rq-axis-*`, `rq-spectrum-*`) because
  class names are built dynamically from result data. A future
  refactor that replaces those dynamic prefixes with static
  `styles.xxx` access could unlock a second pruning pass.
