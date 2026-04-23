# Session Log — 2026-04-23

Content-focused pass across `/what-is-this`, `/for-creators`,
`/for-advertisers`, and `/who-are-we`. Hero rework on
`/what-is-this`, several body-copy replacements, tile reorder on the
Advertisers business case, and a small mission-section motion add on
`/who-are-we`.

## Outcomes

### `/what-is-this`

**Hero headline — new line structure.**
Replaced the 4-line "Values-based / podcast / advertising / network"
stack with three independently-revealing lines:

1. `<BrandedGhostSignal />` — brand typography (GHOST bold uppercase,
   Signal thin 100, opacity 0.85). The `.signal` class's
   `text-transform: none` correctly wins over the parent
   `.heroHeadline`'s `uppercase` cascade.
2. `is the values-based`
3. `podcast advertising network`

Each line wrapped in its own `SplitLinesReveal` (staggered delays
0 / 0.6 / 1.2s, duration 1.8). Went through two intermediate shapes
mid-session:

- First pass was `GhostSignal is the` / `values-based` /
  `podcast advertising network` before the user asked for
  `GhostSignal` alone on line 1.
- `.headlineLine` got `white-space: nowrap` (desktop/tablet) so the
  long bottom line can't wrap; overridden back to `normal` at ≤768px
  so it wraps rather than overflowing on mobile.

**Hero text container — widened.**
`PODCAST ADVERTISING NETWORK` at the clamped max font (72px bold
uppercase) was clipping its final `K` inside SplitType's
`overflow: hidden` `.line` wrapper. Fixes:

- `.heroTextOverlay` width 50% → **82%** at desktop; 55% → **90%**
  at ≤1024px. Overlay now covers part of the video area on the
  right — acceptable since copy is white over a dim sunset loop.
- `.heroTextContainer`: removed the ~700px max-width entirely,
  switched to `width: 100%`. The token scale tops out at
  `--gs-n-900`, so a 1200–1500px token-native clamp wasn't
  available; letting the container fill the widened overlay is
  cleaner than fabricating a non-existent token value.

**"What if advertising could make harmony" section — body replaced.**
Single 2-paragraph body swapped for the new 4-paragraph copy:

1. "We connect podcasters and brands who love the same things."
2. "Every story told, ad placed, and partnership formed is an
   intentional act of world making. …"
3. "We go beyond algorithmic targeting in search of deep resonance.
   So, we've developed the Resonance Quotient (RQ) …" (curly
   apostrophes in source as `&rsquo;`).
4. "This is genuine alignment: creators keep their voice, brands
   keep their conviction, and audiences sense harmony instead of
   interruption."

Each wrapped in a `ScrollFadeUp` with indices 0–3 so they stagger in
sequence. The user's parenthetical note about a
triangle/circle diagram was treated as a design hint, not ship copy,
and left out — flagged in chat.

**"Values Create Value" section — body replaced.**
Single paragraph swapped for two shorter paragraphs, the second
citation-heavy (Acoglu 2023 + Edelman 2025). Flagged "Acoglu" as a
probable spelling of Daron Acemoglu in chat; preserved user's
wording.

**"Who is GhostSignal?" section — body replaced.**
Swapped to new copy; rendered the inline brand mention as
`<BrandedGhostSignal />` so it inherits the split brand-typography
treatment (matches the headline directly above).

### `/for-creators`

- **Administrative Freedom tile**: dropped the parenthetical
  `(including transparent revenue splits)`. New reads
  "We handle the paperwork, contracts, reporting, and payment
  tracking so you are freed up to create."
- **Journey tile 03 (RELATIONSHIP)**: `'Resonance Index'` →
  `'Resonance Quotient'`, and `ensuring the partnership feels
  natural` → `ensuring our partnership feels natural`. Left the
  earlier "Every partnership is curated" untouched — user's
  instruction was scoped to the later `the partnership` mention.

### `/for-advertisers`

- **Business-case tile order** (the `features` array rendered in the
  business section). Old:
  Highly-Attuned → Administrative Simplicity → Real Conversion →
  Targeted Spending. New:
  **Highly-Attuned Audiences → Targeted Spending →
  Administrative Simplicity → Real Conversion.**
- **Journey tile 03 (RELATIONSHIP)**: `'Resonance Index'` →
  `'Resonance Quotient'` (matches the `/for-creators` rename).

### `/who-are-we`

- **Partner-Making headline**: removed the final `FORCE` line
  entirely (including its own `SplitLinesReveal` wrapper). The first
  line's text went from `GHOSTSIGNAL IS A` → plain `IS A` → final
  `<BrandedGhostSignal /> IS` (two edits across two turns — user
  asked for the brand treatment, then asked to drop the trailing
  `A`). Final reading: **"GhostSignal IS / PARTNER-MAKING"** with
  the existing handshake-hyphen animation between `PARTNER` and
  `MAKING` intact.
- **Mission section clouds** added. Mirrors the pattern already in
  use by the hero and promises sections: 3 `<Image>` copies of
  `/images/who-are-we/cloud.png` inside a new `.missionCloudWrapper`,
  each with the shared `.floatingCloud` base class plus the existing
  `cloudFloat1 / 2 / 3` keyframes at 150 / 180 / 200s. Per-cloud
  positions tuned to the shorter mission section: top-left / mid-right
  / bottom-left with opacities 0.22 / 0.18 / 0.15 and blur 1–2px.
- CSS: `.missionSection` gained `position: relative; overflow: hidden`
  so clouds anchor to it rather than the page. `.missionContent`
  gained `position: relative; z-index: 1` so the sticky headline +
  body stay above the drifting layer.
- `export const metadata.description` on `/who-are-we` still reads
  "GhostSignal is a partner-making force." — left as-is because
  it's an SEO meta string, not displayed.

## Files touched (high-level)

| Area | Paths |
|------|-------|
| `/what-is-this` hero + body copy | `src/app/what-is-this/page.tsx`, `src/app/what-is-this/page.module.css` |
| `/for-creators` tile + journey copy | `src/app/for-creators/page.tsx` |
| `/for-advertisers` tile order + journey copy | `src/app/for-advertisers/page.tsx` |
| `/who-are-we` mission section | `src/app/who-are-we/page.tsx`, `src/app/who-are-we/page.module.css` |
| Docs | `docs/SESSION_LOG_2026-04-23.md` |

## Validation (final state)

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 49 referenced public assets resolve |
| Manual browser walkthrough | ✅ hot-reload confirmed on `/what-is-this` hero during iteration |

## Non-goals / deferred

- **Homepage hero**: was edited mid-session before the user clarified
  the `/what-is-this` scope, then fully reverted (typing-loop hero
  and `.heroHeadline` with `text-transform: uppercase` are exactly
  as they were after 2026-04-22). No remaining homepage diff.
- **Orphaned home videos** (`blackcloud2.*`, `city.mp4`,
  `cloud.*`, `cloudblack.mp4`, `country.mp4`, `twoclouds.mp4`,
  `cloud-optimized.mp4`) are still untracked in
  `apps/web/public/images/home/` — same decision as the 2026-04-22
  log. Will need a cleanup pass to decide which are referenced and
  which are junk.
- **`Acoglu` → `Acemoglu`** in the `/what-is-this` "Values Create
  Value" citation. Flagged; not changed without explicit approval.
- **`metadata.description` on `/who-are-we`** still references the
  now-deleted "partner-making force" phrasing. Left untouched — SEO
  meta, not display copy.
- **"Every partnership is curated to feel natural."** on
  `/for-creators` journey tile 03 — kept "Every partnership" since
  the user's instruction was scoped to the later `the partnership`
  mention. Swap later if the consistency bothers you.

## Next-step notes

- If the widened `.heroTextOverlay` (82% desktop) reads as
  too-far-right-encroaching over the video on any particular
  viewport, the cleanest lever is nudging it back toward 72–78%
  rather than re-capping `.heroTextContainer`. The container now
  relies on the overlay for its horizontal bound.
- `.missionSection` now has `overflow: hidden`. If a future visual
  (e.g. a decorative element intentionally bleeding out of the
  mission section) needs to escape, swap to `overflow: visible` and
  the clouds will drift into adjacent sections — which matches how
  the promises cloud wrapper already behaves.

---

## Afternoon / Evening session

Extended the day substantially with navbar work, an RQ dashboard
delete flow, two new canvas/WebGL backdrop effects, and a big
shader iteration on the globe orbits. Snapshot of everything that
happened between the morning commit (`b485418`) and the push at
end of session.

### Navbar

- **Nav CTA**. `navLinks` in `src/lib/nav.ts` got a new `cta: true`
  flag on `/get-in-touch`. `SiteHeader.tsx` branches on that flag:
  CTA entries render with a new `styles.navCta` class (solid black
  pill, white bold text at base size, pill radius, hover lift) and
  skip the per-link fixed-width track the other entries use.
- **Nav spacing rebalance**. The explicit per-link `linkFrameWidths`
  map and inline `style={{ width }}` were removed (seven links + a
  CTA pill didn't fit inside the prior `width: 1385px` + `64px` gap
  track at common desktop widths). `.nav` now uses `width: auto` +
  `column-gap: 32px`; `.navLink` padding-inline tightened from 32
  to 12 with its `::after` underline inset matched.
- **Top-right admin buttons**. The prior single "DESIGN Feedback"
  fixed button on the homepage is now one of a `.adminButtonRow` of
  two: "DESIGN Feedback" → `/design-tasks` (coral) and new "RQ
  Responses" → `/rq-dashboard` (teal, matches RQ brand). Row is
  fixed top-right, 8px gap.
- **SiteHeader on `/get-in-touch`**. Re-added after discovering it
  was missing — previous author of this page had omitted it. Now
  matches the rest of the site.

### RQ Dashboard (`/rq-dashboard`)

- **Keyed-list React warning fixed**. The submissions map wrapped
  each row's two `<tr>`s in a shorthand `<>` fragment; shorthand
  fragments can't carry a `key`, so React warned. Swapped to
  `<Fragment key={sub.id}>` imported from `react` and dropped the
  redundant inner `key`s.
- **Delete flow**. New `DELETE /api/rq-submissions/[id]/route.ts`
  validates the id against a UUID regex (so the route can't be
  used to issue arbitrary PostgREST filters), calls Supabase's
  REST endpoint with `Prefer: return=representation`, and returns
  404 if no row matched. Client-side: the expanded submission
  panel gained a red-outlined "Delete entry" button; clicking it
  opens a blurred-backdrop modal asking "Delete this submission?"
  with name + RQ code inlined. Cancel / backdrop-click dismiss
  (disabled while in flight); Yes-delete hits the endpoint, drops
  the row from local state, closes the modal. Failures render
  inside the modal rather than `alert()`.
- **Table layout polish**. `.rq-dash-details-row > td` cell padding
  zeroed and `.rq-dash-details` made `position: sticky; left: 0`
  with `max-width: min(calc(100vw - 48px), 1400px)` so the
  expanded panel stays within the visible wrapper width even when
  the outer table is wider than the container (and scrolls). The
  email column gained `max-width: 220px` with ellipsis truncation
  (same pattern `.rq-dash-org` uses); table `th`/`td` padding
  tightened `16/14 → 10/10` so the 8-column header no longer pushes
  RQ Code + expand off the right on standard viewports.

### `/snowdrift`

- **Hero split headline**. The prior single `SplitLinesReveal`
  wrapping `"Voices from the cultural future"` was replaced with
  two stacked blocks: `Voices from` (delay 0) and `cultural future`
  (delay 0.45s). A visually-hidden span carries the full phrase for
  screen readers since the visible lines are `aria-hidden`.
- **1-pixel snowfall**. New client component `SnowParticles.tsx` —
  fixed full-viewport canvas layer at `z-index: 0`,
  `pointer-events: none`. Density scales with viewport
  (~70 flakes/megapixel). Motion: very slow downward drift
  (0.08–0.28 px/frame ≈ 5–17 px/s) with a small `sin(phase) * 0.08`
  horizontal wobble; per-particle opacity 0.35–0.9 for depth. Canvas
  backs to `devicePixelRatio` (clamped to 2) so each flake is truly
  1 physical pixel. Pauses on `visibilitychange` hidden;
  `prefers-reduced-motion` freezes the field but still paints it.

### `/what-is-this` — color-bars liquid ripple

- **New canvas backdrop**. Replaced the static decorative
  color-bars `<Image>` with a custom WebGL ripple component
  (`BarsRipple.tsx`) that uses the classic Hugo Elias shallow-water
  algorithm on a 100×800 CPU height field, then samples the bars
  PNG through GPU textures with the height field as a displacement
  map. Cursor moves drop splashes into the grid; the GPU's `LINEAR`
  filter bilinear-upsamples the low-res displacement so ripples are
  smooth, while the bars texture stays crisp at native device
  resolution.
- **Capability gates**. The component only mounts its WebGL path
  when `matchMedia("(hover: hover) and (pointer: fine)")` matches
  and `prefers-reduced-motion` doesn't — phones / touch render the
  static PNG via `next/image`. If WebGL context creation fails, the
  same static fallback renders. No RAF loop or GPU context on
  devices where the effect has no purpose.
- **Aspect lock**. `.decorativeBars` got `aspect-ratio: 652 / 7548`
  so the wrapper recovers the narrow-strip geometry the prior
  `<Image>` enforced via its intrinsic ratio (the canvas has no
  intrinsic ratio, which was inflating the wrapper to fill
  available space on first port).

### `/for-advertisers` — globe orbit shader + result block

Large iteration on the 3D globe rings in `src/components/ScrollScenes.tsx`:

- **Width**: all five ring outer radii bumped so each line is twice
  its original thickness (`0.006 → 0.012` gap between inner/outer).
- **Per-ring travelling ball**. Added `ballIntersect` + `shadeBall`
  helpers. Each ring gets its own 3D sphere whose world angle is
  `uTime * ballSpeed + ballPhase - rotation`. The `- rotation` sign
  (not `+`) was the key correction — the prior version rendered the
  ball 180° from its wake because the ray-transform into ring-local
  inverts the ring's rotation. Speeds are `0.18 + ringId * 0.04`
  (`0.18 / 0.22 / 0.26 / 0.30 / 0.34 rad/s local`) — base 0.18
  deliberately avoids the 0.10 `uRingRotation` that would have made
  ring 1 stationary in world.
- **Ball look**. Five small white spheres (`BALL_R 0.00729`), flat
  shading — earlier specular + Lambertian passes were dialed down
  and finally removed entirely per user direction.
- **Wake**. Trailing Hugo-Elias-style cos-damped wake behind each
  ball in ring-local space. Final form: `cos(d * wakeFreq - uTime *
  phaseSpeed) * envelope`, where `envelope = exp(-d * decay) *
  smoothstep(0, 0.015, d) * (1 - smoothstep(0.7, 0.95, d))`. Four
  decaying peaks trail each ball; the small `phaseSpeed` (1.4 + 0.25
  per ring, ~1.4–2.4 rad/s) lets peaks drift outward slowly while
  the pattern stays anchored directly behind the ball. Peak
  amplitude `0.030`. Then per a later request the whole waveform was
  flipped from radial displacement (in-plane) to Y displacement
  (perpendicular to the ring plane) via a two-step intersection —
  first sample angle at y=0, then re-intersect at y=wave. Finally
  the waveform was removed entirely from the rendered rings while
  the ball-driven colour gradient stayed.
- **Colour gradient**. `ringIntersect` now returns an `out
  float outWakeD` covering the full 0..2π arc behind the ball.
  Each render block mixes `white → ring colour` via `smoothstep(0,
  π/2, wD)` — the first quarter behind each ball is a white-to-hue
  gradient. The last quarter of the orbit (`smoothstep(3π/2, 2π,
  wD)`) fades alpha `0.7 → 0` so the line visibly ends before it
  would loop back to meet the bright tip.

**Result block copy + motion**

- **"The result?" mega headline**. `.resultHeadlineH2` font-size
  `clamp(36px, 5vw, 60px) → clamp(52px, 10vw, 140px)`. One rung
  above the hero-scale `.businessTitle`; reads as the section's
  tentpole.
- **Hero-scale typing**. New `ResultTyping.tsx` client component
  replaces the two-line `SplitLinesReveal` pair. Scroll-triggered
  via `IntersectionObserver`, types char-by-char at the homepage's
  `130ms/char` cadence with the same blur-in per-char entrance.
  Accepts `loopLastLine` — when true, the final line holds, deletes,
  pauses, and retypes indefinitely; used here so "because it is
  better." loops. Final structure: three lines — `Advertising that`
  / `works better` / `because it is better.` — the third loops.
- **Vertical space**. `.businessResult` gained a 96-unit `margin-top`
  + 48-unit `padding-top` (was 24) so the result block sits clearly
  below the step-tile list above it.
- **Hero headline size**. `.businessTitle` font-size bumped to the
  same Monster-M1 scale used on the homepage (`clamp(35px, 6.6vw,
  88px)`), matching the user's ask to treat "GhostSignal is about
  resonance" as a hero beat.
- **Mariah-statue clip**. The parallax-translated Mariah image in
  `.businessVisual` was spilling past the section bottom into the
  `ContactSection` / Jeremy image below. Fixed with
  `clip-path: inset(-200vh -200vw 0 -200vw)` on `.businessSection`
  — clips only at the section's lower boundary (top/sides stay
  open, so the parallax upward travel and wider-than-column framing
  still render), and unlike `overflow: hidden` it doesn't break the
  sticky behaviour.
- **StarFogBackground dim**. The "glowing orb" star field on the
  pitch section was dimmed via a `× 0.35` multiplier on the
  composite star contribution.

### `/for-creators`

- **Journey tiles top-align with statue**. `.journeyLayout` grid
  `align-items: end → start` and `.journeyRight` (new wrapper)
  carries `align-self: start`. Tiles now begin at the same height
  the statue image starts rather than bottoming out with it.
- **"Get In Touch" CTA below the last tile**. Wrapped the `<ol>` in
  a new `.journeyRight` div, appended a `ScrollFadeUp`-revealed
  `<Link>` styled like the page's `.closingCta` (dark pill with
  arrow icon). Index continues from `journeySteps.length` so it
  reveals in sequence. Mobile padding swapped to `edge-pad`.
- **ART19 Partnership card**. New `<aside>` below the CTA: eyebrow
  "ART19 Partnership", body copy using `<BrandedGhostSignal />`
  inline, logo image `/images/for-creators/AAC_ART19_black.svg`
  (new asset, ~17KB). Off-white panel with subtle border +
  backdrop-blur, same left indent as the journey tiles.

### `/who-are-we` — Spline touch lock

- **CSS touch lock** on `.splineWrapper`: at
  `@media (hover: none) and (pointer: coarse)` applies
  `pointer-events: none` + `touch-action: pan-y` so the Spline 3D
  logo can't be grabbed by fingers on iPads / phones; touches pass
  through so the page can scroll normally. Desktop mouse-capable
  devices are unaffected.
- **Scene-level lock**. `SplineEmbed.tsx` now detects touch via
  matchMedia and sets `events-target="none"` on the `<spline-viewer>`
  custom element — belt + suspenders so the Spline runtime itself
  ignores pointer input too. Applied immediately and again after
  500ms for the slow script-load path.
- Confirmed to the user that the 3D logo is still a Spline
  `<spline-viewer>` embed (`prod.spline.design/...splinecode`), not
  a native rewrite.

### `/get-in-touch`

- **Hero height + position**. `.contactSection` is now a flex
  column with `justify-content: flex-end`, `min-height:
  calc(100dvh - 80px)` (near-fullscreen, 80px peek at bottom), and
  asymmetric padding `240 top / 256 bottom` — content anchored to
  the lower portion of the viewport, Jeremy's drop shadow has
  clearance inside the clipped section bounds, and the
  `.formSection` V-clip is visible just above the fold.
- **Cosmic nebula backdrop**. `.contactSection::after` layer carries
  four large blurred radial-gradient nebulae (violet / blue / pink
  / deep-navy) over an `#06060e → #0a0a14` linear gradient base,
  with `inset: -12%` so a slow drift animation never reveals bare
  edges. `@keyframes nebulaDrift` runs 120s `ease-in-out infinite`
  combining small translate values (`±1.5%` / `±0.8–1.5%`) with a
  near-imperceptible `scale 1 → 1.025` — motion is barely perceptible
  but continuous. `prefers-reduced-motion` kills it.
  `.contactSection::before` stars pseudo stays on top at z-index 1;
  content raised to z-index 2.
- **Missing nav restored**. `<SiteHeader links={navLinks} />` added
  at the top of the page's `<main>`.

### New components / files

- `apps/web/src/app/api/rq-submissions/[id]/route.ts` — DELETE handler.
- `apps/web/src/app/snowdrift/SnowParticles.tsx` — canvas snowfall.
- `apps/web/src/app/what-is-this/BarsRipple.tsx` — WebGL ripple.
- `apps/web/src/app/for-advertisers/ResultTyping.tsx` +
  `.module.css` — scroll-triggered typing component w/ loopable
  last line.

### New public assets (tracked)

- `apps/web/public/images/for-creators/AAC_ART19_black.svg`.

### Files touched (high-level)

| Area | Paths |
|------|-------|
| Navbar + CTA + admin buttons | `src/components/SiteHeader.tsx`, `src/components/SiteHeader.module.css`, `src/lib/nav.ts`, `src/app/page.tsx`, `src/app/page.module.css` |
| RQ dashboard delete + layout | `src/app/rq-dashboard/page.tsx`, `src/app/rq-dashboard/rq-dashboard.css`, `src/app/api/rq-submissions/[id]/route.ts` (new) |
| `/snowdrift` hero split + snowfall | `src/app/snowdrift/page.tsx`, `src/app/snowdrift/page.module.css`, `src/app/snowdrift/SnowParticles.tsx` (new) |
| `/what-is-this` ripple bars | `src/app/what-is-this/page.tsx`, `src/app/what-is-this/page.module.css`, `src/app/what-is-this/BarsRipple.tsx` (new) |
| `/for-advertisers` globe shader + result typing + clip + dim | `src/components/ScrollScenes.tsx`, `src/app/for-advertisers/page.tsx`, `src/app/for-advertisers/page.module.css`, `src/app/for-advertisers/StarFogBackground.tsx`, `src/app/for-advertisers/ResultTyping.tsx` (new), `src/app/for-advertisers/ResultTyping.module.css` (new) |
| `/for-creators` journey polish + ART19 card | `src/app/for-creators/page.tsx`, `src/app/for-creators/page.module.css`, `apps/web/public/images/for-creators/AAC_ART19_black.svg` (new) |
| `/who-are-we` Spline touch lock | `src/app/who-are-we/SplineEmbed.tsx`, `src/app/who-are-we/page.module.css` |
| `/get-in-touch` hero + nebula + nav restore | `src/app/get-in-touch/page.tsx`, `src/app/get-in-touch/page.module.css` |
| Docs | this file |

### Validation (final state)

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 50 referenced public assets resolve |
| Manual browser walkthrough | ✅ confirmed across `/what-is-this`, `/for-advertisers`, `/for-creators`, `/snowdrift`, `/who-are-we`, `/rq-dashboard`, `/get-in-touch` during iteration |

### Non-goals / deferred

- **Spline → native rewrite** on `/who-are-we`. The 3D logo is still
  a third-party `<spline-viewer>` embed. Touch-locked but not
  rewritten. Conversion would need a new 3D source (three.js / r3f).
- **"is" italic** in the advertisers result typing was dropped when
  the lines became char-by-char-animated plain text. If needed,
  adding per-char class segmentation (same pattern the homepage
  uses for GHOST/Signal) brings it back.
- **Orphaned home videos** (`blackcloud2.*`, `city.mp4`, `cloud.*`,
  `cloudblack.mp4`, `country.mp4`, `twoclouds.mp4`,
  `cloud-optimized.mp4`) in `apps/web/public/images/home/` remain
  untracked — same asset-policy call as the 2026-04-22 and morning
  2026-04-23 logs.
- **Ballpark Spline watermark**. `SplineEmbed.tsx` still injects CSS
  into the shadow DOM on 5 timers to hide Spline's own UI. Fragile;
  not worth replacing until the whole component is rewritten.

### Next-step notes

- **Ball/wake tuning**. `src/components/ScrollScenes.tsx` has
  knobs in comments next to each uniform: wake `DISP_SCALE`,
  `DAMPING`, `wakeFreq`, `decay`, `phaseSpeed`, ball `BALL_R`,
  `ballSpeed` base/slope. Any of those is a one-number change.
- **Nebula speed**. `/get-in-touch` `@keyframes nebulaDrift`
  duration (120s) is the single dial for perceived motion speed.
- **Email column width (220px)** on the RQ dashboard may clip
  readable-prefix addresses for long corporate emails. Bump if it
  proves too aggressive in practice.
- **RQ Dashboard delete UX**. Only has a confirm modal; no undo
  after a successful delete (the row is already gone from
  Supabase). If undo becomes a requirement, add a soft-delete
  column rather than wiring client-side undo.

---

## Late-evening addendum

Two small `/get-in-touch` polishes after the main session push.

- **Jeremy photo lifted above the navbar.** `.contactPhoto` was
  positioned `top: 24px` inside its cell; on shorter desktop
  viewports the bottom of the photo + its 60px drop-shadow were
  overlapping the bottom-fixed `SiteHeader`. Changed to `top: 0`
  and added `translateY(-48px)` onto the existing `translateX(-40%)`
  transform -- nets ~72px of lift, clears the 140px-tall navbar
  with room to spare.
- **Hero headline split into two reveals.** The single
  `SplitLinesReveal` that wrapped the whole "EVERY PARTNERSHIP
  STARTS WITH A CHAT" `<h1>` is now two siblings inside the h1:
  `Every partnership` (delay 0) and `starts with a chat` (delay
  0.35s), each wrapped in its own `SplitLinesReveal` + a
  `.headlineLine` span (`display: block`). Parent still applies
  `text-transform: uppercase`, so casing on the page is unchanged.

### RQ quiz — persistent "Home" pill

- `apps/web/src/app/rq-quiz/layout.tsx` now wraps `children` with a
  `<Link href="/" className="rq-back-home">` so every quiz view
  (intro, all questions, results) has a fixed top-left exit to the
  homepage. Server component; only `next/link` added, no
  client-side JS weight.
- `.rq-back-home` styles added to `rq-quiz.css`: semi-transparent
  dark pill with `backdrop-filter: blur(8px)` so it reads cleanly
  over both the dark quiz backdrop and the Desert / Snow
  animations on the results screen. Hover/focus lifts the pill and
  slides the arrow 3px left via `.rq-back-home-arrow`. Uses the
  same Inter font + uppercase tracking the quiz uses elsewhere.
