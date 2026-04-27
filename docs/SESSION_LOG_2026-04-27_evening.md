# Session Log — 2026-04-27 (evening)

Continuation session after the marketplace + closeout push. Single
focused arc: a near-complete redesign of `/what-is-this` page motion
and a deeper interaction on the existing globe in the Signal section.

## What changed

### `/what-is-this` — content reorganisation

The page was a stack of full-bleed text sections; restructured into a
clearer 3-column rhythm down the page:

- **"Who is GhostSignal?" section deleted** (per user direction —
  the content lived elsewhere on the site).
- **Harmony section** ("What if advertising could make harmony"):
  headline + body block left-aligned (was centred), `harmonyCircles`
  intersecting-rings backdrop removed, max-width pinned to 540px to
  match Values.
- **Values Create Value section**: switched from `alignLeft` →
  `alignCenter` → `alignRight`, finally with the container right-
  anchored but text inside left-bound (`text-align: left` with
  `width: 100%; max-width: 540px`). This way the right edge of the
  Values block lines up with the harmony section's left padding,
  giving symmetric column rhythm. `.harmonySection` mobile-padding
  media queries added so both sections stay aligned across all
  breakpoints.
- **Final / Signal section** pushed down `margin-top: 100px` for
  breathing room from Values; bars-graph height grew to
  `calc(200vh + 100px)` to follow.
- **Subheadline + headline + tagline block** lifted via successive
  margin-top trims on `.finalSubheadline`: 256px → 200px → 150px →
  finally `calc(--gs-n-200 * --gs-px - 75px)` = 125px.
- **`.finalContent`** got `pointer-events: none` so globe drag works
  through the text region (the elements inside aren't interactive).

### `/what-is-this` — hero video

- Source swapped earlier today (sunset → japanese.mp4, in commit
  `272cbd7`).
- Scroll fade-out tween shortened: `end: "+=140%"` → `+=80%`. Video is
  fully gone before the next section enters viewport — no visible
  seam at the section boundary.
- New tween: `BarsRipple` wrapper now fades **in** at the same scroll
  trigger / start / end / scrub as the video fades out. Wrapped
  `<BarsRipple>` in a refed div so GSAP can target the wrapper, and
  added a `.decorativeBarsCanvas` fill-100% class for the inner
  canvas. Bars start `opacity: 0` in CSS; tween brings them to `0.6`.

### `/what-is-this` — bars graph

- Geometry fix: `top: 100vh` was double-offsetting because the bars'
  parent `.globeWrapper` already starts at the bottom of the hero in
  document flow. Fixed to `top: -10vh; height: calc(200vh + 100px)` so
  bars span Harmony + Values + the new 100px gap before Final.
- The 10vh negative top means bars poke up into the hero's lower
  edge, creating a smoother hand-off as the video fades.

### `/what-is-this` — Harmony section "nocturnal sun"

A new decorative element added centre-stage of the harmony section
("nocturnal black-sun" → evolved to "white sun + orbiting dark moon"):

- **Visual** — bright cream-white sun disk with two layered white
  coronas + an animated rim glow, plus a single dark sphere orbiting
  it on a tilted plane (rotateZ 28° baked in).
- **Sun**: white radial gradient (`#ffffff → #f6f1de → #e8dfb8`) with
  a 3-layer `box-shadow` rim glow that pulses on the same 10s clock as
  the orbit. Two coronas: tight inner + wider outer, anti-phase via
  `animation-delay: -5s`.
- **Moon**: pseudo-3D shaded grey sphere via radial gradient
  (`#2c2c30 → #16161a → #06060a`) with an inset shadow for the
  terminator. CSS `transform-style: preserve-3d` lets the moon depth-
  sort against the sun — front-of orbit eclipses, back-of orbit
  hidden.
- **Drive** — initially CSS keyframes; then **converted to a JS rAF
  loop** with refs (`harmonyOrbitRef`, `harmonyOrbitSphereRef`) so the
  same code path drives auto-spin AND pointer-drag. 36°/s baseline,
  `1°/px` cursor sensitivity on horizontal drag, lerp back to base on
  release. `cursor: grab` / `grabbing` affordance.
- **Iterations through the session**: size 260–420 → halved → ×0.8 →
  ×1.2 → ×1.3 (final 163–263px); position centre-of-screen → right of
  bars (24px gap) → centred → right of bars (160px gap, large gap);
  vertical position 50% → 35%. Diagonal-orbit tilt 28° kept
  throughout.

### `/what-is-this` — Values section "binary stars" (the big one)

This section's left side got a full R3F scene from scratch.

**New file** — `apps/web/src/app/what-is-this/ValuesBinary.tsx`.

- **Render** — Three.js + `@react-three/fiber` + `drei` +
  `postprocessing` (already installed for the marketplace map; this
  reuses the chunk via `dynamic({ ssr: false })`).
- **Geometry** — two PBR-shaded spheres on a rotating group. Sphere A
  white (`#ffffff` material + `#f8f8ff` emissive at 0.35), Sphere B
  black (`#0a0a0c`, no emissive). Final colours after iteration
  (warm/cool → white/black per the user's call). Sphere geometry
  `args=[0.48, 32, 24]`.
- **Lighting** — each sphere carries its own white point light (A at
  4.5 intensity, B at 3.0); a centre point light pulses on a soft
  breath cycle. Faint cool directional fill from behind so silhouettes
  never go pure black.
- **Bloom** — single selective `<Bloom>` pass (luminance threshold
  0.55, intensity 0.7, mipmap blur). No tone-map / SMAA — keeps cost
  low. `EffectComposer multisampling={0}`.
- **Performance gates** — IntersectionObserver mounts the Canvas only
  when in view (`rootMargin: 200px`); DPR capped at 1.25;
  `antialias: false`; `powerPreference: "high-performance"`.
- **Interaction (built then removed)** — drag-to-spin with inertia
  was implemented (cumulative-displacement model, X → separation, Y →
  tilt, friction back to baseline, hover boosts intensity). Stripped
  on user direction in favour of a pure auto-cycle.
- **Final motion model** — separation oscillates on a 14s cosine
  cycle: orbs drift toward each other, fully merge at the cycle peak,
  drift back apart. Cosine shaping holds them at the extremes (apart
  + merged). Tilt slowly drifts on a 63s sine
  (`TILT_BASE + 0.18 * sin(t * 0.1)`). Auto-spin yaw at 0.10 rad/s.
  Reduced-motion users get a static pose.
- **Merge state** — when `sep < MERGE_THRESHOLD` (0.5 world units),
  the two side spheres hide and a single bigger merged sphere
  (`r = 0.65`, white-leaning) reveals at centre. **Hard snap**;
  next-pass goal is a raymarched SDF metaball blend for the actual
  bubbly liquid morph.
- **Wrapper styling** — initially `clamp(280–480px)` square at
  `left: 15%`; widened to full screen width to prevent sphere clipping
  at the canvas edges; finally narrowed to the **left half** ending
  24px before the bars-graph (`right: calc(50% + 9vh + 24px)`) per
  the latest call. `mask-image: linear-gradient(...)` fades the top
  18% and bottom 18% to transparent so the bloom haze doesn't draw
  a visible rectangular footprint against the page background.

### `/what-is-this` final-section globe (`ScrollScenes.tsx`)

Drag interaction extended significantly:

- **Z-tilt offset** — added `uniform float uRingTiltZOffset`. While
  dragging, the cursor's horizontal displacement from drag-start sets
  this offset (0.004 rad/px). Snaps back to 0 on release.
- **X-tilt offset** — added `uniform float uRingTiltXOffset` for the
  vertical-axis equivalent (0.003 rad/px from cursor Y delta).
- **Per-ring response** — two new shader helpers:
  ```glsl
  ringTiltZFor(ringId) = BASE_Z + uRingTiltZOffset * (0.6 + ringId * 0.2);
  ringTiltXFor(ringId) = BASE_X + uRingTiltXOffset * (1.4 - ringId * 0.2);
  ```
  Reversed slope between the two so X-drag and Y-drag fan the rings
  in opposite patterns, giving the user visibly distinct controls.
  All ten call sites (5 ringIntersect + 5 ballIntersect) updated to
  use the helpers.
- **Lerp drive** — render loop lerps current toward target at 0.12
  per frame, sets both uniforms each frame. Reduced-motion users see
  static rings (target stays 0).

## Files touched

| Area | Paths |
|------|-------|
| `/what-is-this` page surface | `apps/web/src/app/what-is-this/page.tsx`, `.../page.module.css` |
| Values binary (new) | `apps/web/src/app/what-is-this/ValuesBinary.tsx` (new) |
| Globe shader + drag | `apps/web/src/components/ScrollScenes.tsx` |
| Docs | `docs/SESSION_LOG_2026-04-27_evening.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| Manual browser walkthrough | ⏳ user confirmed each iteration through the session |

## Closing state

- Branch: `272cbd7` (last push) → next commit pending (this work).
- `/what-is-this` has the new motion choreography end-to-end.
- The Values binary is the page's most visually loaded element; its
  next-step is the SDF metaball blend (currently a hard merge snap).
- Globe drag is now 2-axis (X = diagonal swing, Y = forward/back tilt)
  with per-ring fan effect.

## Non-goals / deferred

- **Bubbly liquid SDF metaball merge** for the Values binary — the
  current hard visibility-flip on merge is a placeholder. Next focused
  turn: replace the two `<mesh>` spheres with a single full-screen
  quad running a raymarched SDF shader using `smin` (smooth-union)
  for the blend.
- **Mobile responsive review** of the new R3F scene — the wrapper
  shrinks via the existing clamp, but the camera FOV / sphere
  positions are tuned for desktop. Could need a viewport-aware
  position adjust.
- **`.staticFlicker` dead code** still present in the stylesheet
  (class defined but never rendered). Worth removing in a future
  cleanup pass.
- **Orphaned home videos** in `apps/web/public/images/home/` and
  `docs/Creator Life Cycle.xlsx` — same disposition as prior logs.
