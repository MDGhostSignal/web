# Session Log — 2026-04-22

Heavy content and motion pass across the homepage, `/for-creators`,
`/for-advertisers`, `/what-is-this`, `/signal-sheet`, and the shared
site header. Two chunks: (1) standalone commit `7755487` earlier in the
session replacing the single fog-overlay hero with a 6-cell video
mosaic + headline shadow; (2) everything below, which walks back the
mosaic to a single full-bleed video, introduces a proper typing-loop
hero, and polishes several inner sections.

## Outcomes

### Homepage (`/`)

Iterated the hero backdrop multiple times per user feedback:
6-cell grid → single `twoclouds` centred in a 200px frame (with a 1px
diagnostic outline, 75% fill, then 100%, then mouse parallax) →
eventually **a single `desktop` video filling the viewport
edge-to-edge, no padding, no parallax**.

- `page.tsx`: mouse-parallax `useEffect` removed entirely. Swapped
  `HERO_VIDEO_SLOT` to `"desktop"`. Added a mount-time `useEffect`
  that (a) forces `html` + `body` background to `#000` and (b) sets
  `html.scrollbarGutter = "auto"` while this page is mounted —
  reverted on unmount. Needed because global `scrollbar-gutter: stable`
  reserves ~15px on the right that otherwise shows body's default
  white next to the video.
- `page.module.css`: `.cloudBackground` now `position:fixed; inset:0;
  background:transparent` (was `bottom: 140px` with black bg). The
  SiteHeader at z-index 50 overlays it — eliminates the sub-pixel
  hairline between the container bottom and the header top. `.heroVideo`
  uses `position:absolute; inset:0` alongside `width/height:100%` for
  sub-pixel-robust edge anchoring. Zeroed `border/outline/padding/margin`
  on both. All pre-existing `.heroGhost` / `.heroSignal` / `.heroLine*`
  / mask-reveal keyframes **deleted** — moved into the typing-hero
  module.

**New typing-hero component** (replaces `SplitLinesReveal` on the
headline):
- `src/app/HomeTypingLoop.tsx` — exports `HomeTypingHero`. State
  machine (not a reducer — direct `setTimeout` chaining):
  1. Types line 1 char-by-char: `GHOST` bold-uppercase, `Signal`
     thin (100-weight, 0.85 opacity), ` is for people` plain.
     Segment-based rendering so brand typography applies at any
     partial length.
  2. 450ms gap.
  3. Types line 2 in full: `who are making the world.`
  4. Loop: hold 2.2s → delete back to `who are ` → type
     `creating the world.` → hold → delete → `shaping the world.` →
     hold → delete → `making the world.` → repeat.
- Each character renders as its own `<span key="...">`. Stable keys
  mean React keeps already-mounted spans and only animates newly-
  appended ones. Per-char CSS entrance: `opacity 0 → 1` +
  `filter: blur(6px) → 0` + `translateY(4px) → 0` over 360ms on a
  gentle cubic-bezier. Duration exceeds TYPE_MS (130ms) so adjacent
  characters overlap mid-blur — reads as one continuous motion
  rather than discrete pops (the earlier "jagged and jumpy" feedback).
- Caret: 0.06em × 0.85em bar, hard-step 1s blink, attached to the
  currently-typing line. Respects `prefers-reduced-motion`.
- Subhead drop-shadow animation removed (along with its
  now-orphaned `@keyframes heroTextShadowGrow`).

### `/what-is-this`

- **Platforms section** added above the standardised `ContactSection`,
  under the "Read the White Paper" block. White backdrop, centred
  column: eyebrow-style `<h2>Platforms</h2>` at section-headline
  scale, subhead "Listen on your favorite platform.", and a
  horizontal row of four logos. Initially inline monochrome SVGs;
  after the user dropped real wordmarks into
  `public/images/what-is-this/`, swapped to `<Image>` references to
  `spotify.svg` / `applepodcasts.svg` / `amazon.svg` / `youtube.svg`.
  Locked to a shared **40px height / auto width** (28px under 640px)
  so wordmarks with different aspects (Spotify 3:1, Apple ~5:1) sit
  at the same visual weight.
- **Cherry-blossom repulsion** on `HeroBlossoms.tsx`:
  `REPEL_STRENGTH` 2.2 → **1.4** (~36% softer impulse per frame).
  Radius and damping unchanged.

### `/for-creators`

- **"Your Membership Journey"** bumped to Monster Headline M1 size
  (`clamp(35px, 6.6vw, 88px)`) — matches `.text-monster-1` now used
  on the homepage and elsewhere.
- **Mariah statue PNG parallax** (the metallic sculpture on the left
  of the journey section). Same lerp + rAF pattern as
  `/for-advertisers`: section-scoped mousemove writes smoothed
  `--mx / --my` (-1..1) onto the `<section>`; `.journeyImage`
  translates opposite via `translate3d(calc(var(--mx) * -12px),
  calc(var(--my) * -10px), 0)`. Skipped on coarse pointers.

### `/for-advertisers`

The Business Case section absorbed a cluster of changes:

- **Brand-consistent headline**: `GHOSTSignal is about resonance.` →
  split into two independent `SplitLinesReveal` lines, line 1 now
  renders `<BrandedGhostSignal />` (mirroring `/what-is-this`), line
  2 = "is about resonance" (also briefly tried "about resonance"
  mid-session — user restored "is").
- **Mariah statue mouse parallax** (the `/images/home/figma/mariah.png`
  on the right). Same pattern as the other parallax effects, scoped
  to `businessRef`. Combined with the existing `-50%` centering and
  `ParallaxY` scroll parallax: transform becomes
  `translate3d(calc(-50% + var(--mx) * -14px), calc(var(--my) * -10px), 0)`.
- **Clouds backdrop** ported from the `/who-are-we` hero pattern.
  Wrapper is `position: absolute; overflow: hidden` so the sticky
  `.businessVisual` on the right column keeps working (full-section
  `overflow: hidden` would break sticky). Went through several
  iterations: original 5 clouds with `filter: brightness(0)` →
  user dropped a proper `cloud.png` into
  `public/images/for-advertisers/` → removed the `brightness(0)`
  hack, kept per-cloud `blur()` → **doubled to 10 clouds**, existing
  scales shrunk ~25% and new ones sized smaller (0.1–0.28 range) →
  opacities bumped 1.5–2× for visibility
  (0.55/0.48/0.4/0.34/0.28 for the original 5, 0.24–0.42 for the new
  5). Each cloud has its own keyframe (140–220s durations) so the
  motion never syncs visibly.
- **"The result?" headline** elevated to `<h2>` at
  `.businessTitle` scale (clamp 36–60px). The body lines
  ("Advertising that works better / because it is better.") moved
  to `<h3>` at a clamp 22–32px scale. Old `.resultHeadline` class
  replaced by `.resultHeadlineH2` + `.resultHeadlineH3`.
- **Heart animation removed** from the `.impressionsWord` in the
  pitch section — 7 heart spans stripped from markup, `.heart`
  + `.heart:nth-child(1..7)` + `@keyframes heartPop` deleted.
  Dropped `.impressionsWord` from the `:has()` overflow-escape
  selector (nothing left to escape the SplitLinesReveal mask; only
  the halo on "conviction" still needs it).

### Site header (`SiteHeader`)

- Background **`#f2f2f2` → `#ffffff`** (pure white).
- Link hover treatment: thin 1px underline wipes in
  left-to-right over 420ms on a cubic-bezier, inset-anchored to the
  link's inline padding so it sits under the text rather than the
  full padded box. Hovering the nav dims siblings to 0.4 opacity;
  the directly-hovered link stays at 1.0. No dim at rest. Keyboard
  focus gets the same treatment for a11y.
- **Direction-based visibility** on scroll. Past the 100px threshold
  the header follows scroll direction: scrolling down runs the
  existing `runOut` (links/logo/CTA slide out), scrolling up runs
  `runIn`. Near-top (<= 100) always visible. `DIR_THRESHOLD = 10px`
  filters momentum / trackpad micro-jitter. Implemented by adding
  `lastY` + delta tracking to the existing `onScroll` handler —
  the `.js-s-hide-sh` ScrollTrigger (footer-hide hook) is untouched.

### `/signal-sheet`

- **Adverts section rendered as a coordinate-plane graph** instead
  of the card grid the other two sections use. Thin black Y axis
  (left) + X axis (bottom), faint graph-paper gridlines via two
  layered `repeating-linear-gradient`s. Axis labels ("Y · Resonance
  ↑" and "X · Format → Reach") at the corners. 3 ticks per axis
  (01 / 02 / 03). 3×3 plot grid — each cell has a `(col, row)`
  coordinate stamp, a `+` crosshair, the term's 01–09 number,
  title, and body. Dashed internal gridlines; outer cell borders
  stripped so dashes don't overlap the axes. All text uses the
  existing signal-sheet tokens (`--font-body`, gray-950/700/500,
  `tabular-nums`, letter-spacing). Responsive: 2-col at ≤900px,
  1-col at ≤600px, with dashed borders rebalanced at each breakpoint.
  Body text rewritten to match the user's exact wording for all 9
  terms (CPM, Pre/Mid/Post-Roll, Baked-In, Programmatic, Host Read,
  Signal Pool / Spot Ad, Excess Inventory, Revenue Share, Promo Swap).
- **Hero full-screen** — `min-height: 100dvh` + flex column +
  `justify-content: center`. Content now occupies the whole first
  screen; "Philosophical Anchors" no longer peeks above the fold.
- **Hero padding rebalanced** — first tried `max(calc(200 * --gs-px),
  14vh)` top / 180 bottom; user noted that was too much. Final:
  equal top + bottom at `max(calc(120 * --gs-px), 10vh)`. Equal
  pads keep flex-centred content at the optical midpoint.
- **Hero jump-nav** — 3 quick text links under the meta row, one per
  section (`#philosophical-anchors`, `#technical-terms`, `#adverts`).
  Each link: `01/02/03` tabular index + uppercase label + downward
  arrow. Hover / focus brightens to pure white, a thin underline
  fades in, arrow nudges 3px down. Flex row, wraps on narrow viewports.

## New components / files

- `src/app/HomeTypingLoop.tsx` + `.module.css` — replaces the prior
  inline `SplitLinesReveal` hero headline on `/`.

## New public assets (referenced + committed)

- `public/images/for-advertisers/cloud.png` — swapped in by user
  after the initial port from `/who-are-we` showed nothing against
  the light gray bg.
- `public/images/what-is-this/{spotify,applepodcasts,amazon,youtube}.svg`
  — user-provided wordmarks for the Platforms section.

Unreferenced `.mp4` files in `public/images/home/` (`blackcloud2.*`,
`cloud.*`, `city.mp4`, `cloudblack.mp4`, `country.mp4`, `twoclouds.mp4`,
`cloud-optimized.mp4`) are **left untracked** per the asset policy in
`AGENTS.md` — same decision as the `loop{1..4}.mp4` call in the
2026-04-19 audit. The previously-committed mosaic files
(`city.webm`, `cloudblack.*`, `country.*`, `ship2.*`, `twoclouds.*`) are
now orphaned in the tree; not removing them this session unless asked.

## Files touched (high-level)

| Area | Paths |
|------|-------|
| Homepage hero + typing | `src/app/page.tsx`, `src/app/page.module.css`, `src/app/HomeTypingLoop.tsx` (new), `src/app/HomeTypingLoop.module.css` (new) |
| `/what-is-this` Platforms + petals | `src/app/what-is-this/page.tsx`, `src/app/what-is-this/page.module.css`, `src/app/what-is-this/HeroBlossoms.tsx` |
| `/for-creators` journey polish | `src/app/for-creators/page.tsx`, `src/app/for-creators/page.module.css` |
| `/for-advertisers` business case pass | `src/app/for-advertisers/page.tsx`, `src/app/for-advertisers/page.module.css` |
| SiteHeader white bg + hover + scroll-direction | `src/components/SiteHeader.tsx`, `src/components/SiteHeader.module.css` |
| `/signal-sheet` graph + hero | `src/app/signal-sheet/page.tsx`, `src/app/signal-sheet/page.module.css` |
| Assets | `public/images/for-advertisers/cloud.png`, `public/images/what-is-this/{spotify,applepodcasts,amazon,youtube}.svg` |
| Docs | `docs/SESSION_LOG_2026-04-22.md` |

## Validation (final state)

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 49 referenced public assets resolve |
| Manual browser walkthrough | ✅ user confirmed "looks very nice" on typing + "a lot of good progress" at wrap-up |

## Non-goals / deferred

- **Orphaned home videos**: `city.*`, `cloudblack.*`, `country.*`,
  `ship2.*`, `twoclouds.*` are still committed but no longer
  referenced. Leaving for a future cleanup pass so this session's
  commit stays focused.
- **Official platform artwork** has landed as SVG wordmarks; the four
  inline icon SVGs from the first pass were deleted with the swap.
- **ContactSection default imagery** is still `jeremycontact.jpg` on
  `/what-is-this`. User hasn't asked to vary it.

## Next-step notes

- If stutter shows up on the new single-`desktop` hero video,
  `preload="metadata"` is set on it — parity with the earlier
  for-advertisers lesson says bumping to `preload="auto"` helps
  Chromium avoid in-flight-fetch hitching during the first loop.
- The homepage `useEffect` that overrides `html.scrollbarGutter` is
  scoped to mount/unmount of `LegacyHomePage`. If we ever add a
  scroll-below-hero surface to the homepage that actually overflows,
  the missing gutter will cause visible content shift when the
  scrollbar appears — revisit then.
- `signal-sheet`'s graph cells become a bit tall on narrow viewports
  when a body paragraph runs long. Current `grid-auto-rows: minmax(
  220px, auto)` keeps them aligned at a baseline. Fine for now;
  ugly wrapping surfaces in a 320-wide viewport would be the tell.
