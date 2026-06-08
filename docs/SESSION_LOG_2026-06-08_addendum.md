# Session Log — 2026-06-08 (Addendum)

Continued the XQ character work after commit `e3dbe4b`. Built a
parallel `/xq-characters2` gallery showing each archetype as a
fresh **3D-space constellation line-art** drawing (zodiac/astronomy
inspired), with isometric perspective + depth construction lines +
counter-rotating scenery. Restored the original Grok-style
GHOSTSignal-wordmark-in-3D-fog backdrop behind `/xq-quiz`. Added
sorting by last-contact on the CRM contacts list.

## 1 · /xq-characters2 — 3D constellation gallery

New parallel route mirroring `/xq-characters` structure but with
every archetype rendered in a fresh visual register.

**Visual language**:
- viewBox 240×280 monoline (same as 2D set for layout parity)
- Isometric / 3/4 perspective on figure pose
- Joint vertices as constellation stars (small filled circles,
  twinkle on stagger via `data-t="0-7"`)
- Constellation lines connecting stars to form silhouettes
- Signature props rendered as 3D wireframes (front-face solid +
  back-edge dashed + connecting depth lines): Steward's lantern
  is an isometric box, Architect lives inside a wireframe cube,
  Designer's drafting board is a parallelogram, Conservator's
  desk is a full 3D prism, Institution Builder's pillars are
  rectangular prisms with capitals
- `OrbitalHalo` — subtle dashed arcs behind every figure for the
  "in space" register

**Container animation**: each character wraps in `.xq-c3d-sway` —
`perspective(620px) rotateY(±15°)` with explicit hold keyframes at
15% and 65% giving the deliberate pause-rotate-pause cadence the
user asked for.

**Counter-rotation parallax**: scenery elements rotate OPPOSITE the
figure via `.xq-c3d-counter` at `perspective(520px) rotateY(±30°)`.
CSS transforms compound through nesting, so child amplitude needs
to exceed parent's to net out as visibly opposite (parent +15° +
child -30° = visible -15° from viewer). Applied to:
- Architect: the cube network
- Designer: the drafting board
- Conservator: the desk
- Institution Builder: the pillars + architrave (wrapped in one group)

**Per-archetype motion details**:
- **Steward** flame — two overlapping teardrop flame paths
  (`xq-c3d-flame-front` at 3.2s, `xq-c3d-flame-back` at 5.1s)
  desynced for "live fire" feel; 3-tier filled glow halo at
  r=9/12/16 with stacked alpha for radial spillage. Tightened to
  stay inside the lantern bounds (x: 108–132, y: 138–168).
- **Shepherd** flock — entire flock group swirls ±6° + tiny
  drift on a 7s loop so stars + their connecting lines stay
  tethered while the cluster orbits. Staff simplified to a single
  shaft (removed parallel depth ridges per user feedback).
- **Catalyst** sparks — 18 spark stars emit from the megaphone
  mouth and travel `translate(60px, 70px)` (far right + down, well
  clear of the character) over 3.4s with `cubic-bezier(.3,0,.7,1)`
  gravity easing; staggered every ~0.25s for a constant stream.
  Anchor `GlowStar` stays at the mouth.
- **Artisan** brush — wrist sweeps the brush in a `rotate(±10–12°)`
  arc with slight translate (`xq-c3d-brush-stroke` at 5.4s),
  imitating stroke motion. Trail strokes still fade in/out in
  sequence (`xq-c3d-stroke-pulse`).
- **Institution Builder** — pillars counter-rotate; scroll gets a
  9px vertical lift + 1.8° tilt (`xq-c3d-carry` at 6s) so the
  carry motion reads clearly.

**Head shapes** (added per user feedback):
- Steward — circle
- Shepherd — oval
- Conservator — circle (universal observing register)
- Institution Builder — rounded rectangle (pillar-capital register)
- Catalyst — triangle pointing up (forward kinetic)
- Artisan — diamond (off-axis creative)
- Designer — hexagon (geometric precision)
- Architect — pentagon (systemic five-sided)

All ~12–18px outlined shapes, fill=none, with an inner star + thin
spine link down to the neck anchor. Sized up ~30% in a later
iteration after first pass read as too small.

**Visible arms** (Steward, Conservator, Institution Builder): explicit
cubic-bezier `<path>` strokes at `strokeWidth=1.6 opacity=0.9` with
elbow control points pushed well outside the body silhouette
(Steward elbows at x=72/168, Conservator at 64/168, Institution
Builder at 68/172) so the limbs read clearly. Elbow joint stars
mark the bend.

**Reveal screen**: ResultsScreen accepts a `variant: "line-art" | "3d"`
prop (string discriminator, RSC-serializable) that selects the
character renderer for both the reveal portrait and the spectrum-map
thumbnails. The `/xq-characters2/[code]` preview passes `variant="3d"`.

## 2 · /xq-quiz — Grok-style fog + wordmark backdrop

Restored the very-first-draft homepage hero scene as the quiz
landing backdrop:
- **FogOverlay** — recovered the WebGL FBM-noise wisp shader
  from `apps/web/src/app/FogOverlay.tsx` (already in the repo,
  was the homepage hero overlay in commit `a521858`)
- **Wordmark backdrop** — huge "**GHOST**Signal" text
  (`clamp(72px, 16vw, 220px)`), `GHOST` in 800-weight uppercase,
  `Signal` in 200-weight italic, color `rgba(255,255,255,0.13)`
  with purple-tinted text-shadow glow
- Layering: wordmark z-index 0, fog z-index 1 (drifts IN FRONT of
  the text, dissolving it Grok-style), content well z-index 2
- All fixed-position so the scene persists across quiz scroll
- Earlier interim approach with `SpinningLogo3D` (recovered from
  commit `5f179a0~1`) was the wrong scene; replaced with the
  wordmark approach per user clarification

## 3 · Spectrum map hover + tooltip + variant

`XQSpectrumMap` converted to client component (`"use client"`).
Each archetype anchor wrapped in a `<g>` with:
- `onMouseEnter/Leave/Focus/Blur` tracking `hoveredCode` state
- `transform-origin` set inline to the anchor coordinates
- Hover lift via `.xq-spectrum-anchor:hover` CSS:
  `transform: translateY(-8px) scale(1.06)` + dual drop-shadow
  (dark + accent-tinted) over 280ms
- Tooltip rendered as `foreignObject` near the hovered anchor —
  flips above/below based on row, clamped to map bounds, neutral
  border (1px `rgba(255,255,255,0.06)`, no accent outline per user
  feedback), tagline still picks up archetype accent in text
- Axis labels shrunk from 11px → 9px (subdued annotations)
- Tooltip foreignObject height bumped 92 → 110 to prevent clipping

Variant prop on the map (`variant?: "line-art" | "3d"`) selects which
XQCharacter component renders inside the anchor thumbnails.

## 4 · Admin contacts — sort by Last contact

Added `sort` comparator to the `last_contact` column at
`apps/web/src/app/admin/contacts/page.tsx:840`. Sorts on the ISO
date string via `localeCompare` (lex-sort = chronological for ISO);
null/empty values sink to bottom on asc, top on desc, matching the
Owner column convention. The DataTable infra already handles
asc↔desc toggle via header click.

## Files touched

### New
- `apps/web/src/app/xq-characters2/page.tsx`
- `apps/web/src/app/xq-characters2/layout.tsx`
- `apps/web/src/app/xq-characters2/xq-characters2.module.css`
- `apps/web/src/app/xq-characters2/[code]/page.tsx`
- `apps/web/src/components/xq/XQCharacter3D.tsx`
- `apps/web/src/components/xq/xq-character-3d.css`
- `apps/web/src/components/xq/characters3d/_shared3d.tsx`
- `apps/web/src/components/xq/characters3d/{Steward,Shepherd,Conservator,InstitutionBuilder,ArtisanReformer,Catalyst,Designer,Architect}3D.tsx`
- `apps/web/src/components/SpinningLogo3D.tsx` (recovered from git)
- `apps/web/src/components/SpinningLogo3D.module.css` (recovered)

### Modified
- `apps/web/.stylelintignore` — added `src/app/xq-characters2/`
- `apps/web/src/components/xq/XQSpectrumMap.tsx` — `"use client"`,
  hover state, tooltip, variant prop, smaller axis labels
- `apps/web/src/app/xq-quiz/page.tsx` — wordmark + fog backdrop
- `apps/web/src/app/xq-quiz/xq-quiz.css` — wordmark + fog styling
- `apps/web/src/app/xq-quiz/ResultsScreen.tsx` — variant prop +
  `XQCharacter3D` import for the picker
- `apps/web/src/app/admin/contacts/page.tsx` — last-contact sort

## Validation

All gates green:
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean

Live verification: `/xq-characters2`, `/xq-characters2/C-P-C`,
`/xq-characters2/X-S-L`, `/xq-characters` (still), `/xq-quiz` all
return HTTP 200 on the dev server.

## Open / next-step notes

- The 3D constellation characters are intentionally architectural
  / minimalist. Iteration room: heavier "atmospheric" effects
  (more particles, parallax background layers, depth fog around
  the figures themselves).
- The Catalyst's spark trajectory now extends well past the
  character's right edge. If sparks start overlapping the
  spectrum map text on `/xq-characters2`, dial back the amplitude
  or count.
- `/xq-characters` (the 2D line-art set) and `/xq-characters2`
  (the 3D constellation set) are now two parallel surfaces sharing
  the same data layer (`@/lib/xq/characters` + `@/lib/xq/constants`).
  Either can be deprecated independently.
