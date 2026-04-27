# Session Log — 2026-04-27

Two related pieces of work today: a hero-video stutter fix on
`/for-advertisers` (with a small design tweak), then porting the same
treatment to `/for-creators` along with a visual rework of the
hero's particle layers.

## 1. /for-advertisers — hero video stutter fix + rightward shift

Commit `f0989ff`. User reported the hero video stuttered/froze for
about a beat once a second on the live site, even after the prior
work that stripped rotate/scale animations off the video's ancestors.

Root cause: the fixed full-viewport `.staticOverlay` element used
`mix-blend-mode: overlay`. That forces Chromium to re-rasterise the
entire viewport (including the playing video) into a backdrop buffer
every frame so the overlay can blend with it. Combined with a
viewport-sized 2× DPR pollen canvas redrawing 95 particles every rAF
tick, the compositor budget was overrun in roughly second-long
windows — the visible result is exactly the stutter that was
described.

Three-part fix:

- **Drop `mix-blend-mode: overlay`** on `.staticOverlay`. The element
  is `position: fixed; inset: 0; opacity: 0.06`, which means with
  blend mode active it was forcing a full-viewport composite per
  video frame. Compensated with `opacity: 0.06 → 0.05` so the
  alpha-blended noise reads about the same as the previous overlay
  blend.
- **`.hero`: `isolation: isolate` + `contain: paint`.** Gives the
  hero its own self-contained compositor stack so future fixed/blend
  siblings can't drag the playing video into a shared backdrop
  buffer again. Belt + suspenders alongside the overlay change.
- **`HeroPollen`: DPR capped at 1** (was `min(devicePixelRatio, 2)`)
  and particle count trimmed `95 → 64`. Pollen is intentionally
  soft, so 2× sampling adds nothing visually; the cluster still
  reads as continuous dust at the new count.

Also (design ask, same commit): `.heroVideoWrapper` shifted further
right — `right: 160 → 32`. Started with a `transform: scale(1.05)`
in the same change, then user asked to revert to native size before
push. Final state is the rightward shift only, no scale.

## 2. /for-creators — Seattle video + firefly rework + same perf treatment

Three layered changes on the for-creators hero, then the same
stutter-fix treatment applied at the end.

### Background video → seattle.mp4

User dropped `seattle.mp4` into `apps/web/public/images/for-creators/`.
Replaced the prior dual-source `field3.webm` + `field3.mp4` pair
with the single seattle source. No `.webm` companion exists for the
new clip — if size/bandwidth becomes a concern we can transcode one
later, but for now mp4 plays everywhere and the asset audit passes
49/49.

### HeroBees → HeroFireflies (cursor swarm)

Replaced the cursor-attached bee swarm with fireflies. New
`HeroFireflies.tsx`; old `HeroBees.tsx` deleted. Both `dynamic()`
import and JSX usage updated in `page.tsx`.

Behavioural delta vs. bees:

- **Slower drift.** `followRate 0.018–0.043` (was `0.24–0.33`),
  `angleSpeed 0.35–0.9 rad/s` (was `2.6–4.2`). Fireflies don't dart;
  they linger.
- **No heading rotation.** Fireflies are radially symmetric — head
  direction is invisible.
- **Wide loose orbit.** `baseRadius 28–140 px` (was `16–37`) so the
  cluster reads as ambient glow rather than a tight chase.
- **Per-firefly slow blink.** `blinkRate 1.2–2.6 rad/s` (≈ 0.2–0.4
  Hz) on independent phases, brightness floor 0.25 so they never
  fully extinguish.
- **Render.** Soft warm-amber radial-gradient halo + bright cream
  core, `globalCompositeOperation = "lighter"` so overlapping halos
  pool light. Canvas-level `filter: blur(0.55px)` removed — the
  gradient handles softness on its own.
- **Count.** 4 → 9. Fireflies are smaller individually so the swarm
  needs more bodies to feel populated.

### HeroDandelion → HeroFirefliesDrift (ambient drift)

User asked for the dandelion drift to also become fireflies, "same
behavior as the dandelions". New `HeroFirefliesDrift.tsx`; old
`HeroDandelion.tsx` deleted.

Behaviour preserved verbatim — upward baseline drift with depth-scaled
velocity, 140 px cursor-repulsion radius with linear falloff,
spring-damp back to baseline (`DAMP_TO_BASELINE = 0.025`), lower-half
ceiling, respawn from bottom edge. Visual swapped: pappus halo + fluff
+ achene replaced with the same firefly halo/core gradient as above,
plus a per-firefly subtle blink (floor 0.55 — gentler than the cursor
swarm because this layer is supposed to read as ambient atmosphere,
not a kinetic swarm).

Tumble/tip rotation parameters dropped — fireflies are radially
symmetric, so per-particle rotation has nothing to display.

The hero now layers two firefly populations in different roles —
ambient drift rising off the meadow, plus a cursor-attached cluster
that gathers loosely around the pointer.

### Same stutter-fix treatment

After the visual work, applied the for-advertisers fix verbatim:

- `.staticOverlay`: `mix-blend-mode: overlay` removed, `opacity:
  0.06 → 0.05`.
- `.hero`: `isolation: isolate` + `contain: paint`.
- `HeroFirefliesDrift`: DPR capped at 1 (was up to 1.75), count
  `52 → 36` (and `26 → 20` on coarse pointer).

The for-creators hero also runs `HeroFog` (a fullscreen WebGL
shader) and `HeroFireflies` (cursor swarm) alongside the video, so
this page's compositor budget is genuinely heavier than
for-advertisers'. The static-overlay blend was the same root cause,
though, so this should land most of the win — if stutter persists
the next dials are the fog shader's DPR cap and the cursor swarm's
count.

## Files touched

| Area | Paths |
|------|-------|
| /for-advertisers perf + shift | `apps/web/src/app/for-advertisers/page.module.css`, `apps/web/src/app/for-advertisers/HeroPollen.tsx` |
| /for-creators video swap | `apps/web/src/app/for-creators/page.tsx` |
| /for-creators bees → fireflies | `apps/web/src/app/for-creators/HeroFireflies.tsx` (new), `apps/web/src/app/for-creators/HeroBees.tsx` (deleted), `apps/web/src/app/for-creators/page.tsx` |
| /for-creators dandelion → firefly drift | `apps/web/src/app/for-creators/HeroFirefliesDrift.tsx` (new), `apps/web/src/app/for-creators/HeroDandelion.tsx` (deleted), `apps/web/src/app/for-creators/page.tsx` |
| /for-creators perf treatment | `apps/web/src/app/for-creators/page.module.css`, `apps/web/src/app/for-creators/HeroFirefliesDrift.tsx` |
| New asset | `apps/web/public/images/for-creators/seattle.mp4` |
| Docs | `docs/SESSION_LOG_2026-04-27.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 49 referenced assets exist (after seattle.mp4 wired in) |
| Manual browser walkthrough | ⏳ user to confirm after Vercel redeploy |

## Closing state

- Branch: `f0989ff` (pushed) → next commit pending (this session log
  + the for-creators changes).
- Two firefly components on /for-creators in distinct roles:
  cursor-attached swarm (`HeroFireflies`) + ambient drift
  (`HeroFirefliesDrift`).
- Same stutter-fix pattern now applied to both `/for-advertisers`
  and `/for-creators` heroes — the `mix-blend-mode: overlay` on
  fixed `.staticOverlay` is the universal antipattern. If a third
  page picks up the same overlay treatment it should follow the
  same fix proactively.

## Non-goals / deferred

- **`.webm` for `seattle.mp4`.** The original field clip had both
  formats; seattle is mp4-only. Worth transcoding for size if perf
  on slower connections becomes a concern.
- **HeroFog DPR cap and HeroFireflies (cursor) count tuning.** Not
  touched — the `mix-blend-mode` removal is the dominant fix.
  Revisit only if stutter persists on `/for-creators`.
- **Orphaned home videos** in `apps/web/public/images/home/` and
  `docs/Creator Life Cycle.xlsx` — same disposition as prior logs,
  intentionally not committed.
