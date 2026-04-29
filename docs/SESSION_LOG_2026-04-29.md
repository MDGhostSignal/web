# Session Log — 2026-04-29

Long, fully-on-the-public-site session. Three top-level arcs:
(1) hero-video swap on `/what-is-this`; (2) the Values Create Value
binary-orbit scene rebuilt from a 2-blob droplet into a 7-orb
multi-orbit system with a press-and-hold interaction; (3) the
Harmony eclipse scene's CSS-3D moon swapped for a real R3F scene
with 3 lit spheres. Plus a layout fix between the Signal globe and
the white-paper CTA, and very subtle scroll-driven parallax on the
two starfield layers.

## 1. Hero video swap

`/what-is-this` top hero now plays `garden3.mp4` instead of
`japanese.mp4`. Asset already lived in
`apps/web/public/images/what-is-this/`; only the `<source src>` in
`page.tsx` changed. Scroll fade + cherry-blossom overlay treatment
left alone.

## 2. Values Create Value — full rework

The binary-star metaball scene became, in stages over the session,
a much darker, slower, larger-but-smaller-orbed system with
press-and-hold-to-freeze + drag-to-rotate.

### Container

- `.valuesBinaryWrapper` height bumped from
  `clamp(360px, 55vh, 640px)` → `clamp(480px, 82vh, 880px)`. Spans
  significantly more vertical real-estate of the section.
- Bottom mask gradient widened: solid #000 stop pulled from 82% →
  58% so the bloom halo has a 42%-of-height runway to dissolve
  smoothly. Earlier, peak-brightness moments showed a hard
  container edge at the bottom — gone now.

### Material direction

Iterated several times under user feedback toward the eclipse-moon
look:

| Property | Before | After |
|----------|--------|-------|
| `color` | `#2e2e34` (dark chrome) | `#1a1a1e` (eclipse moon) |
| `roughness` | `0.2` | `0.85` |
| `metalness` | `0.78` | `0.04` |
| `emissive` | `#0a0a10` | `#08080a` |
| `emissiveIntensity` | `0.15` | `0.3` |

Bloom intensity dropped `0.85 → 0.18` with luminance threshold
raised so the post-pass doesn't re-glaze the matte surface.

### Lighting cut roughly in half

Across all sources to address a too-bright read:

| Light | Before | After |
|-------|--------|-------|
| `ambientLight` | `0.55` | `0.27` |
| Cool directional (`#b8c0e0`) | `0.55` | `0.27` |
| Warm directional (`#ffd8a8`) | `0.35` | `0.17` |
| Centre `#ffffff` point | `1.4` | `0.56` |
| Blob-tracker A (`#ffffff`) | `6.5` | `2.6` |
| Blob-tracker B (`#fff4e8`) | `5.5` | `2.75` |

Matching `breath`-multiplier changes inside `useFrame` so the
runtime intensity follows the new initial values.

### Cycle re-shape: 14s symmetric → 50s four-phase

Replaced the original symmetric cosine with an asymmetric
water-droplet cycle, then dramatically slowed the whole thing:

- `PERIOD` 14s → 22s → **50s**
- 0.00–0.40 — drift apart (ease-out, slowing into max sep)
- 0.40–0.50 — hover at max separation
- 0.50–0.80 — pull-in (smoothstep — slow approach, accelerate,
  decelerate into contact like surface tension)
- 0.80–1.00 — stay merged as one droplet

At wrap, sep is already 0 so the next cycle picks up from the
merged state with no jump.

Per-blob orbital speeds cut to ~40% of mid-session values; parent
yaw drift `0.1 → 0.04 rad/s`.

### 2 blobs → 7 metaballs on independent orbits

The big structural change. From 2 blobs orbiting the X-axis to
**7 blobs** (2 main + 3 medium + 2 small) on seven distinct
orthonormal-basis orbital planes:

```
strength  baseRadius          speed   plane
0.145     MAX_RADIUS          0.20    XY tilt
0.145     MAX_RADIUS          0.20    XY tilt (opposite phase)
0.087     0.85 × MAX_RADIUS   0.34    XY-rotated 60°
0.087     0.78 × MAX_RADIUS   0.46    XZ-rotated 45°
0.087     0.92 × MAX_RADIUS   0.26    YZ-rotated
0.05      0.65 × MAX_RADIUS   0.56    XY-rotated 60° / Z
0.05      0.55 × MAX_RADIUS   0.70    XZ + tilted Y
```

`MAX_RADIUS` settled at **0.272** (down from 1.0 → 0.5 → 0.32 → 0.272
across iterations). Every orbit radius ≤ MAX_RADIUS so no blob
ever travels further than that distance from the centre.

Drive logic in `useFrame`:

```ts
const angle = spec.phase + t * spec.speed;
const r = spec.baseRadius * normSep; // shrinks to 0 at merge
position = (basisA*cos(angle) + basisB*sin(angle)) * r / MC_SCALE;
```

Plus per-blob phase-shifted ripple wobble (`merged = 1 -
sep/MAX_RADIUS`) so the merged droplet shimmers instead of
pulsing in lockstep.

### Marching-cubes detail bump

`resolution` 64 → **96**, `maxPolyCount` 20k → **60k** so the
isosurface reads smooth, not faceted. Each metaball's `subtract`
restored to 6 (an earlier 4 had cancelled a strength reduction).

### Press-and-hold interaction

Section-spanning interaction overlay introduced. Final behaviour
after iteration:

- Hover anywhere over the Values section → cursor `grab`.
- Press and hold → animation slowly freezes; cursor → `grabbing`.
- Drag while holding → horizontal = yaw, vertical = pitch.
- Release → animation slowly resumes from where it was paused.

Implementation:

- Shared `ValuesControl` ref (`{frozen, yaw, pitch}`) lifted to
  `page.tsx`. Refs (not state) so updates never re-render the
  Canvas.
- `BinaryScene` runs on its own `localTime` accumulator; `dt` is
  multiplied by `speedFactor` that lerps between 0 and 1 with a
  ~1.1s time-constant driven by `controlRef.current.frozen`.
- User yaw/pitch added on top of the orbit group's auto-tilt/spin
  rotation each frame.

CSS: `.valuesInteraction` / `.valuesInteractionGrabbing` with
`position: absolute; inset: 0; z-index: 5; touch-action: none`.

Trade-off accepted: text in the Values section is no longer
selectable since the overlay sits above it.

## 3. Harmony — CSS-3D moon → R3F scene

The single CSS-3D orb (radial-gradient div with `translateZ`) was
visibly flat from the side once we extended the same drag UX to
the Harmony section. Replaced with a real R3F Canvas in a new
component.

### New file: `HarmonyOrbs.tsx`

R3F scene mirroring `ValuesBinary`'s control pattern. Three real
PBR-shaded `<sphereGeometry>` meshes (segments 36×36) on
independent orbital planes:

| Orb | radius | size | speed | plane |
|-----|--------|------|-------|-------|
| Big | 0.6 | 0.18 | 0.6 rad/s | XY tilted |
| Medium | 0.45 | 0.115 | 0.95 rad/s | XY-rotated 60° / Z |
| Small | 0.32 | 0.075 | 1.45 rad/s | XZ tilted / Y |

Material matches the new Values palette (`#1a1a1e`, roughness
0.85, metalness 0.04, faint emissive). Lighting tuned for an
eclipse-moon read: warm key from the sun side, dim cool fill from
behind.

The component owns its IntersectionObserver mount-gate and a
`localTime + speedFactor` lerp identical to ValuesBinary.

### Section integration

- `harmonyOrbitRef` + `harmonyOrbitSphereRef` removed; replaced
  with `harmonyControlRef: ValuesControl`-shaped object.
- The ~80-line rAF `useEffect` that drove the CSS transforms was
  ripped out and replaced with three small DOM-pointer handlers
  on the existing `.harmonyInteraction` overlay (press-hold-drag
  pattern, identical to Values).
- The orbit + sphere divs replaced by `<HarmonyOrbs
  controlRef={harmonyControlRef} />` inside a new
  `.harmonyOrbsWrapper` (inset: -50% so orbs at radius 0.6 have
  room to swing without clipping).
- Drag sensitivities preserved from the prior CSS feel: yaw
  1°/px, pitch 0.5°/px clamped to ±75°.

### Known trade-off

R3F can't depth-test against the CSS sun layers, so the moons no
longer pass behind the sun for the eclipse moment. The user
explicitly traded that for true 3D forms when dragging — fine for
this iteration. If we want eclipse-pass-behind back, the next
step is moving the sun into R3F.

## 4. Layout fix — Signal ↔ White paper spacing

`.whitepaperSection` had a *negative* `margin-top` (-64 design
units) pulling it up toward the Signal globe section. Flipped to
`+160` design units → ~224px more breathing room between the 3D
globe and the "Access our white paper" CTA.

## 5. Starfield parallax

Subtle scroll-driven parallax on the two star layers in
`ParallaxBackground.module.css`:

- `.stars::before` (250px tile, brighter stars) drifts at
  −0.04 × scrollY.
- `.stars::after` (300px tile, dimmer stars) drifts at
  −0.02 × scrollY.

Driven via CSS custom properties (`--star-y-1`, `--star-y-2`) set
by an rAF-batched scroll listener in `ParallaxBackground.tsx`,
consumed as `background-position: 0 var(--star-y-N)`. Using
`background-position` (not `transform`) lets the tiled pattern
wrap cleanly with no edge gaps.

Different speeds give relative motion = depth. Nebula radial
gradients on `.stars` itself stay fixed as the deepest "infinite"
layer.

## Files touched

| Area | Paths |
|------|-------|
| What-is-this hero | `apps/web/src/app/what-is-this/page.tsx` |
| Values scene | `apps/web/src/app/what-is-this/ValuesBinary.tsx` |
| Harmony scene (new) | `apps/web/src/app/what-is-this/HarmonyOrbs.tsx` |
| What-is-this styles | `apps/web/src/app/what-is-this/page.module.css` |
| Parallax background | `apps/web/src/components/ParallaxBackground.tsx`, `.module.css` |
| Public asset (referenced) | `apps/web/public/images/what-is-this/garden3.mp4` |
| Docs | `docs/SESSION_LOG_2026-04-29.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings (after removing unused `useEffect` import) |
| `npm run assets:audit` | ✅ 50 referenced public assets exist |
| Manual browser walkthrough | ⏳ user iterated through every change live in dev throughout the session |

## Open follow-ups / pending

- Harmony moons no longer eclipse-pass behind the sun (R3F can't
  depth-sort against CSS layers). Next step if desired: move the
  sun disk + coronas into R3F.
- Values + Harmony interaction overlays sit above body text —
  text in those sections is no longer selectable. Could be
  narrowed to skip text bounding boxes if that becomes an issue.
- `paintLongHouse` dead code in marketplace painter still pending
  cleanup from prior log.
- Untracked orphan `home/` videos + `Creator Life Cycle.xlsx` +
  `logo/SVG/ghostsiggnal-admin-white-4c.svg` — same disposition
  as prior logs (not shipped, left untracked).
