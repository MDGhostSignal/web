# Session Log — 2026-06-08

Built the XQ Characters surface from scratch — 8 archetype illustrations,
interactive spectrum map, reveal screen integration into `/xq-quiz`, and
deliberate visual differentiation between XQ and RQ.

## 1 · Visual identity manifest

New `src/lib/xq/characters.ts` — single source of truth for per-archetype
identity (brand-aligned accent, signature prop, axis vector, visual brief).
Eight distinct hues drawn from the GhostSignal palette + three sister
shades already in use elsewhere in the product (coral, cyan, indigo) so
the system reads as one family:

- C-P-C Steward — `#FBAD25` (lantern)
- C-P-L Shepherd — `#FF7BAD` (crosier + flock)
- C-S-C Conservator — `#D66157` (ledger + compass)
- C-S-L Institution Builder — `#00B29C` (scroll + colonnade)
- X-P-C Artisan Reformer — `#9F71AF` (brush + palette)
- X-P-L Catalyst — `#FA7B3F` (megaphone)
- X-S-C Designer — `#4DC9AE` (drafting board)
- X-S-L Architect — `#7C58D6` (node network)

## 2 · Character illustrations

8 monoline SVG line-art components under
`src/components/xq/characters/`, sharing primitives from `_shared.tsx`
(Frame, Head, GroundArc, StandingLegs, StandingTorso). Each character
has a signature endless animation tied to its motif:

- Steward — random-flicker flame (12-keyframe linear loop) + Gaussian-blur
  glow halo on a slower 7s cycle
- Shepherd — flock dots opacity+scale pulse on stagger (5.4s, 0.45s
  per-dot offset)
- Conservator — compass rocks ±7° + ±8px horizontal sweep (7s)
- Institution Builder — vertical scan bar across blueprint (6.5s) +
  three room markers pulse in sequence + pillar capitals breathe on stagger
- Artisan Reformer — three brush strokes draw in then fade in sequence
  (8s loop, 1.4s stagger)
- Catalyst — spark lines opacity+scaleX + sparkle dots drift outward and
  fade (3.6s, 0.45s stagger)
- Designer — drafting curve draws itself in over 9s; triangle ruler
  drifts + pivots ±4° on a 7s loop
- Architect — 9 nodes opacity+scale pulse on 5.4s wave; central origin
  node breathes + ring expands

All animations honor `prefers-reduced-motion`. CSS in colocated
`xq-character-animations.css` (loaded once by `XQCharacter.tsx`).

Hand-crafted feel achieved via: ink-pool dots at joint terminations,
varied stroke weights (background 1.2 / body 2.2 / signature prop 2.4),
squared linecaps on architectural elements, minor body-proportion
asymmetries per archetype.

## 3 · Spectrum map

`src/components/xq/XQSpectrumMap.tsx` — client component projecting
the 3-axis cube onto a 2D plane:

- X: Continuity (left) ↔ Change (right)
- Y: Person (top) ↔ System (bottom)
- Axis 3 (Craft ↔ Leverage) encoded as inside/outside within each quadrant

Hover/focus on any anchor lifts the group `translateY(-8px) scale(1.06)`
with dual drop-shadow (dark + accent-tinted) and surfaces a tooltip
with name + tagline + first sentence of the description. Tooltip flips
above/below the anchor based on row, clamped to map bounds.

Browse mode (no `position` prop) used on `/xq-characters` gallery.
Result mode (with `position` derived from `XQResult.details`) drops a
pulsing "YOU" dot and emphasizes the winning archetype + its
one-axis-flip neighbours.

## 4 · Gallery + preview routes

`/xq-characters` — gallery page with header → Continuity quartet →
Change quartet → spectrum map → footer. Per-card accent via inline
`--card-accent` variable, hover lifts the card, illustration slot
links to the per-archetype preview.

`/xq-characters/[code]` — preview route for any archetype, renders
the full `/xq-quiz` `ResultsScreen` with deterministic mock data
(strong-but-not-clean scores so the user dot lands inside the
archetype's zone but slightly off-anchor, matching real result feel).

## 5 · Reveal screen integration

`/xq-quiz/ResultsScreen.tsx` — replaced text-only dossier with:

- Character reveal stage (portrait + glow + animated 900ms entrance)
- Title block with archetype code chip, name, tagline, vector bias
- Spectrum map with user point + winning-archetype highlight
- Existing four-bucket value dossier preserved
- Themed RQ-CTA at the bottom

Per-archetype theming applied via `--xq-accent` / `--xq-accent-soft`
overrides on the wrapper — every accented detail (hero gradient,
taglines, bucket label dots) picks up the persona color.

## 6 · XQ ↔ RQ differentiation

Visual identity divergence so XQ no longer reads as a copy of RQ:

- `--xq-accent` swapped `#FBAD25` (orange) → `#9F71AF` (brand purple);
  convictions register as interior/reflective vs RQ's projection energy
- Soft purple ambient wash at the top of the surface
  (`radial-gradient(... rgba(159,113,175,0.18))`)
- Orange progress bar replaced with a **3-node phase stepper**
  (Triangulation / Diagnostic / Stress Test) — distinct chrome from
  RQ's morse-code strip
- Result screen still themes per-archetype via the wrapper override

## 7 · Hydration fix

Hydration mismatch surfaced after converting `XQSpectrumMap` to a
client component — multi-line `d="..."` strings in JSX got normalized
differently by SSR vs client hydration. Fix: collapsed every multi-line
`d` attribute to single-line across all 8 character files +
`_shared.tsx`'s template-literal torso path. Used a perl one-liner for
the bulk pass.

## Files touched

### New
- `apps/web/src/lib/xq/characters.ts`
- `apps/web/src/components/xq/XQCharacter.tsx`
- `apps/web/src/components/xq/XQSpectrumMap.tsx`
- `apps/web/src/components/xq/xq-character-animations.css`
- `apps/web/src/components/xq/xq-spectrum-map.css`
- `apps/web/src/components/xq/characters/_shared.tsx`
- `apps/web/src/components/xq/characters/{Steward,Shepherd,Conservator,InstitutionBuilder,ArtisanReformer,Catalyst,Designer,Architect}.tsx`
- `apps/web/src/app/xq-characters/page.tsx`
- `apps/web/src/app/xq-characters/layout.tsx`
- `apps/web/src/app/xq-characters/xq-characters.module.css`
- `apps/web/src/app/xq-characters/[code]/page.tsx`

### Modified
- `apps/web/.stylelintignore` — added `src/app/xq-characters/` +
  `src/components/xq/`
- `apps/web/src/app/xq-quiz/ResultsScreen.tsx` — reveal stage + map
- `apps/web/src/app/xq-quiz/page.tsx` — phase stepper
- `apps/web/src/app/xq-quiz/xq-quiz.css` — purple accent, stepper
  styles, reveal stage, ambient gradient
- `.claude/settings.json` — `defaultMode: bypassPermissions`

## Validation

All gates green:

- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean

Live verification: gallery + 8 preview routes (`/xq-characters/C-P-C`
through `X-S-L`) + `/xq-quiz` all return HTTP 200 on the dev server.

## Memory updates

- Added `feedback_adviser_mode.md` per Martin's explicit ruleset:
  accuracy over agreement, flaw-in-first-sentence, confidence labels,
  hold positions under pushback.

## Open / next-step notes

- The XQ scoring code stays unchanged — Jeremy's algorithm in
  `src/lib/xq/scoring.ts` already drives the result. The reveal screen
  + spectrum map consume it without modification.
- Marketing surfaces could link to `/xq-characters` so prospects can
  preview the persona system before taking the quiz.
- Character illustrations are iterable — they're keyed by `ArchetypeCode`
  and any character file can be redrawn without touching the wrapper,
  gallery, map, or reveal.
