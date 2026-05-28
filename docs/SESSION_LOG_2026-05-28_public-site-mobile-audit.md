# Session Log — 2026-05-28 (Public-site mobile audit)

## Summary

Full mobile audit + fix pass on the front-facing site (admin tree excluded). User reported on phone: hero sections cut off, scroll locking up on what-is-this, headline reveal animations not firing, navbar broken. Worked iteratively through 8+ rounds on a real device, then extended the same hero treatment to for-creators and removed an overflowing decorative image on for-advertisers.

Three commits on `main` covering the work:

1. `299b2c0` — fix(mobile): public-site mobile audit — heroes, scroll freeze, perf, hamburger
2. `aa1d36d` — fix(mobile-nav): full-screen overlay + restore animations on what-is-this
3. (this session's last commit) — for-creators hero + for-advertisers mariah hide

## Recon (parallel)

Spawned 4 `Explore` subagents in parallel before touching code, each focused on one slice:
- nav/header mobile behavior
- hero sections + responsive breakpoints across all 7 public pages
- what-is-this scroll-jacking implementation
- motion library mobile guards

Output drove a 4-phase plan that the user signed off before any edits.

## Hero cut-off (3 pages)

`100vh` / `120vh` → `100dvh` so the mobile browser-chrome collapse doesn't truncate the hero.

### Edited
- `apps/web/src/app/for-creators/page.module.css:33` — `120vh` → `120dvh`
- `apps/web/src/app/for-advertisers/page.module.css:32` — `120vh` → `120dvh`
- `apps/web/src/app/what-is-this/page.module.css:18` — `100vh` → `100dvh`

## What-is-this — scroll freeze, overflow, perf

The page locked up when scrolling past the hero. Three concurrent issues:

1. **Interaction overlays ate scroll gestures.** `.valuesInteraction` and `.harmonyInteraction` were full-section `inset: 0` divs with `touch-action: none` and React `onPointer*` handlers. On touch, every tap landed on them. Disabled via `pointer-events: none; touch-action: auto` at ≤991 px.
2. **Right-side overflow.** `.harmonySun` positioned with `left: calc(50% + 9vh + 160px)` pushed the orbs canvas off the right edge of phone viewports. Hidden on mobile + added `overflow-x: clip` on `html` + `.page` as backstop.
3. **Signal globe still draggable.** `ScrollScenes` attaches pointer listeners directly to its canvas via `addEventListener`. Blocked at the CSS level with `.finalGlobeWrapper { pointer-events: none }` (browser doesn't dispatch pointer events to descendants of a `pointer-events: none` ancestor).

After several rounds the page was still freezing at the harmony section. Took the nuclear option: gated **every** WebGL / canvas / heavy-animation component behind `sceneEnabled` (a `useSyncExternalStore` watching `(min-width: 992px)`). User confirmed page worked. Then re-enabled the non-interactive ones (`ParallaxBackground`, `HeroBlossoms`, `BarsRipple`, `ScrollScenes`, hero scrub-fade) one round later. **Harmony orbs + values binary stay gated to desktop** per the user's explicit ask — they are heavy R3F scenes with drag interactions that don't make sense on touch.

### Edited
- `apps/web/src/app/what-is-this/page.module.css` — overflow-x: clip on `.page`, transparent `.heroBackground` on mobile, hide `.harmonySun` / `.harmonyOrbsWrapper` / `.valuesBinaryWrapper` at ≤991 px, pointer-events: none on `.valuesInteraction` / `.harmonyInteraction` / `.finalGlobeWrapper` at ≤991 px, body text bumped to xl (no shrink on mobile).
- `apps/web/src/app/what-is-this/page.tsx` — `useSyncExternalStore` gate (`sceneEnabled`) on `<HarmonyOrbs>` and `<ValuesBinary>`. Hero scrub-fade tweens (3× scrub:1 ScrollTriggers) skipped on mobile via `window.matchMedia` inside the layout effect.
- `apps/web/src/app/globals.css` — `overflow-x: clip` on `html` as a second line of defense (body already had it).

## What-is-this — hero white border

Desktop hero is a video inside a 100 px white inset frame. On phones the frame ate most of the viewport. Triple-layered fix at ≤991 px:

```css
.hero { padding: 0; }
.heroVideoWrapper {
  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
}
.heroBackground { background: transparent; }
.heroContent { padding-inline: var(--edge-pad); }
```

`!important` defeats source-order edge cases; transparent `.heroBackground` means even if the inset somehow doesn't apply there's no white pixel to render as a frame.

## Motion library — mobile reveal regression

Initially gated `SplitLinesReveal` / `ScrollFadeUp` / `ParallaxY` behind `document.fonts.ready` so SplitType wouldn't measure at fallback-font widths. **This broke mobile**: the gate prevented the tween from firing at all on phones, leaving headlines permanently hidden behind the yPercent:110 line mask. Reverted to the historical synchronous behavior — `ScrollTriggerOrchestrator` already calls `ScrollTrigger.refresh()` once fonts load, which handles position drift without needing a per-component gate.

### Edited
- `apps/web/src/motion/SplitLinesReveal.tsx` — gate reverted.
- `apps/web/src/motion/ScrollFadeUp.tsx` — gate reverted.
- `apps/web/src/motion/ParallaxY.tsx` — gate reverted.

## Homepage hero polish

User asked for: word "world" breaks mid-word, font too small, CTA too small, hamburger missing on landing.

- **Word-break**: each character in `HomeTypingHero` is `display: inline-block`. Per CSS-Text spec, inline-block boundaries are line-break opportunities — that's why "world" wrapped as "wor / ld" on narrow viewports. Refactored `renderLine1Chars` / `renderLine2Chars` to group consecutive non-space chars into a `<span class="word">` wrapper with `display: inline-block; white-space: nowrap`. Spaces remain standalone `.ch` siblings providing the only legal break points.
- **Headline font**: `clamp(35px, 6.6vw, 88px)` → `clamp(44px, 8vw, 88px)` so the headline still reads as a hero on phone viewports instead of looking like a paragraph.
- **CTA**: bumped to 20 px / 48 px padding + 18 px font on mobile (was 14 / 32 + 16).
- **Hamburger** wasn't showing on tablet portrait — `globals.css` hides the desktop nav at ≤991 px but the hamburger only engaged at ≤768 px, leaving 769–991 px with no navigation. Extended mobile breakpoint to ≤991 px in `SiteHeader.module.css`; removed the now-dead tablet block.

### Edited
- `apps/web/src/app/HomeTypingLoop.tsx` — word grouping refactor.
- `apps/web/src/app/HomeTypingLoop.module.css` — `.word` class.
- `apps/web/src/app/page.module.css` — headline clamp + mobile CTA bump.
- `apps/web/src/components/SiteHeader.module.css` — mobile breakpoint 768 → 991 px.

## Mobile nav — full rebuild

User reported: hamburger opens an empty white square taking only the top third of the screen, no visible X close button. Two layered bugs:

1. **`position: fixed` inside `position: fixed`** — `.mobileOverlay` was nested inside `.headerRoot` (also `position: fixed`). On iOS Safari the inner element gets sized to its content instead of the viewport, manifesting as a small popup in the top portion of the screen.
2. **No fallback close affordance** — the only close was the hamburger-turning-X via `mobileTriggerBarOpen` transform. With the overlay above the header (after raising its z-index for full-screen coverage), the hamburger sat behind it and was unreachable.

### Edited
- `apps/web/src/components/SiteHeader.tsx` — return value wrapped in fragment; `.mobileOverlay` rendered as a sibling of `.headerRoot`, not nested. Added dedicated `.mobileCloseBtn` with two crossed bars inside the overlay (top-right corner).
- `apps/web/src/components/SiteHeader.module.css` — overlay `display: flex; align-items: center; justify-content: center` (vertically centered links); `width: 100vw; height: 100dvh` belt-and-suspenders; `z-index: 60` (above `.headerRoot` z:50); link size bumped to 3xl; `.mobileCloseBtn` styled as 44×44 touch target. Header `background: #ffffff !important` to defeat any `is-head-active` state leaking from desktop scroll.

## For-creators — mirror what-is-this hero on mobile

User asked to apply the same hero treatment as what-is-this. Same patterns at ≤991 px: `.hero { padding: 0 !important; min-height: 100dvh; align-items: center }`, `.heroVideoWrapper` inset zeroed with `!important`, `.heroVideo` switched from `object-fit: contain` (letterboxed) to `cover` so it fills the wrapper edge-to-edge, `.heroContent { padding-inline: var(--edge-pad) }`.

Removed redundant `.hero` padding + `min-height: 100vh` overrides from the 768 px and 560 px blocks (they were re-asserting the desktop white frame at narrower widths).

### Edited
- `apps/web/src/app/for-creators/page.module.css`

## For-advertisers — hide overflowing decoration

User: the "mariah" statue PNG in the `.businessVisual` column kept drifting far below where it should display. Cause: it's wrapped in `<ParallaxY range={["-35rem", "35rem"]}>`. At ≤1024 px the image is full-width per `.visualImage { width: 100%; max-width: none }`, so the 35rem parallax range visually drags a large image well past the section bounds. Hidden at ≤991 px — section text carries on its own; the sculpture is decoration only.

### Edited
- `apps/web/src/app/for-advertisers/page.module.css` — new `@media (max-width: 991px) { .businessVisual { display: none } }` block.

## Validation

After every round:
- `npm run typecheck` — green every time
- `npm run lint` — green every time (one ESLint hit for `setState in useEffect`, fixed by switching to `useSyncExternalStore`)
- `npm run lint:css` — green every time

User tested on a real phone after each commit + Vercel deploy (one round wasted time because the user was reloading the live site while we were iterating locally before the first commit; addressed by committing + pushing earlier and more often).

## Files touched (total this session)

- `apps/web/src/app/HomeTypingLoop.module.css`
- `apps/web/src/app/HomeTypingLoop.tsx`
- `apps/web/src/app/for-advertisers/page.module.css`
- `apps/web/src/app/for-creators/page.module.css`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/page.module.css`
- `apps/web/src/app/what-is-this/page.module.css`
- `apps/web/src/app/what-is-this/page.tsx`
- `apps/web/src/components/SiteHeader.module.css`
- `apps/web/src/components/SiteHeader.tsx`
- `apps/web/src/motion/ParallaxY.tsx`
- `apps/web/src/motion/ScrollFadeUp.tsx`
- `apps/web/src/motion/SplitLinesReveal.tsx`

## Open / next steps

- Verify the for-creators hero + for-advertisers mariah hide on the user's phone after the final push.
- Public-site mobile audit on the remaining pages (`/who-are-we`, `/get-in-touch`, `/snowdrift`, `/signal-sheet`) — same hero treatment likely needed where they use the inset-video pattern.
- Once mobile is sturdy, revisit whether HarmonyOrbs + ValuesBinary can be re-enabled on mobile with a much lighter implementation (static SVG instead of R3F canvas) — keeps the visual identity without the perf cost.
- Untracked confidential docs (`docs/Creator Life Cycle.xlsx`, `docs/XQ Draft.txt`, `docs/nimble_contacts.csv`) still need a gitignore entry — flagged earlier in the session but the user didn't confirm and we never got back to it.
