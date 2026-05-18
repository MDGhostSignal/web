# Session Log — 2026-05-18 (what-is-this responsiveness + R3F stability)

Final phase of the day. Two targeted fixes on `/what-is-this`.

## 1. Hero headline — clean wrap on narrower viewports

The hero headline phrase "PODCAST ADVERTISING NETWORK" was being cut
off on the right at intermediate viewport widths (roughly
768 px – 1100 px). Cause: each `SplitLinesReveal` line wrapper had
`white-space: nowrap` so that on desktop each phrase reads as one
visually distinct line. The override to `white-space: normal` only
kicked in at ≤768 px, which left a band of widths where the line
forcibly overflowed the inset-bound content column.

Fix: removed `white-space: nowrap` from `.headlineLine` entirely
(and the now-redundant `white-space: normal` override from the
768 px media block). On wide viewports the column is wider than the
phrase, so the text naturally lays out on one row — visual outcome
unchanged. On narrower viewports it now breaks at a word boundary
("PODCAST ADVERTISING / NETWORK", "PODCAST / ADVERTISING / NETWORK"
at phone widths) instead of overflowing. The `SplitLinesReveal`
GSAP tween still works on wrapped lines because it animates the
wrapper element, not the visual rows inside.

## 2. R3F canvases — fix context-loss error overlay + idle GPU drain

Reported: leaving the `/what-is-this` page open for a couple of
minutes triggered a "broken error window" (the Next.js dev error
overlay). Cause: the `<canvas>` was firing `webglcontextlost`
when the browser GPU watchdog kicked in (idle timeout / GPU memory
pressure from two simultaneous heavy R3F canvases — `HarmonyOrbs`
and `ValuesBinary`). Nothing was listening for the event, so it
surfaced as an unhandled error and Next.js's overlay popped up.

Two paired fixes applied to both `HarmonyOrbs.tsx` and
`ValuesBinary.tsx`:

### a) Hook `webglcontextlost` + `webglcontextrestored`

Added `onCreated={({ gl }) => …}` on each `<Canvas>` that registers
a `webglcontextlost` listener calling `ev.preventDefault()`. Per
the WebGL spec, that tells the browser the context is recoverable
— the browser fires `webglcontextrestored` shortly after, three.js
listens for that event and re-uploads textures / programs / shaders
automatically, and the animation resumes without surfacing the
error to React. Also added `failIfMajorPerformanceCaveat: false`
to the `gl` config so lower-end GPUs that would otherwise refuse
the context entirely don't fail outright.

### b) Pause `useFrame` when off-screen

Both canvases previously kept their per-frame loops running even
when scrolled out of view. Each loop animates orbits, shader
uniforms, and (in ValuesBinary's case) a Bloom postprocessing
pass — so two canvases burning GPU cycles for the entire session
adds up. Added a separate `visible` state alongside the existing
one-way `active` mount state. The `IntersectionObserver` flips
both: entering the viewport sets `active = true` (one-shot, never
unmounts) and `visible = true`; leaving sets only `visible = false`.
The `<Canvas>` reads `visible` into its `frameloop` prop:

- `frameloop="always"` while visible — normal animation
- `frameloop="never"` while off-screen — zero per-frame GPU work

Mount state stays one-way so re-entering doesn't cause a re-init
flash; the loop just resumes.

Net effect: the GPU only animates whichever canvas is currently on
screen, which both reduces ambient memory pressure (so context
loss is less likely to happen at all) and means a context-loss
event during an idle period now recovers transparently instead of
blowing up the page.

## Files touched

| Area | Paths |
|------|-------|
| Headline wrap | `apps/web/src/app/what-is-this/page.module.css` |
| R3F context-loss + frameloop pause | `apps/web/src/app/what-is-this/HarmonyOrbs.tsx`, `ValuesBinary.tsx` |
| Session log | `docs/SESSION_LOG_2026-05-18_r3f-stability.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| Manual: page open ~several minutes | ✅ no error overlay; animations continue looping |
