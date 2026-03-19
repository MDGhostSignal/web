# GhostSignal Motion Library

> **For Agents**: This is the canonical motion/animation library. Always import from `@/motion` instead of writing custom GSAP code. See `AGENTS.md` for the full design system overview.

---

## Motto-inspired motion library (mirrors `wearemotto.com`)

This project’s motion primitives are based on the **actual implementation** used on `wearemotto.com` (as observed in their shipped JS bundle `main.js?version=19`).

### Animation stack used by Motto

- **GSAP** (core)
- **ScrollTrigger** (scroll-driven triggers + scrubbed animations)
- **Draggable** (interactive carousels/sliders)
- **Lenis** (smooth scrolling)
- **Highway** (SPA-style page transitions)
- A text splitting utility (their code shows a `new ...({type:"lines"})` pattern commonly used for line splitting)

We mirror this stack in our codebase using GSAP/ScrollTrigger/Draggable + Lenis. (We’re in Next.js, so we don’t mirror Highway 1:1; we’ll implement route transitions separately if/when needed.)

---

## Available components (current)

All components are client components and live under `src/motion/`.

## Observed animation patterns on Motto (and our mapping)

These are directly observed in their minified bundle. Numbers/eases below reflect what we saw in the code.

- **Scroll entrance reveal (cards/list items)** → `ScrollFadeUp`
  - `fromTo(el, { y:60, opacity:0 }, { y:0, opacity:1, duration:1, ease:"power2.out", delay:0.1*index, scrollTrigger:{ trigger: el, start:"top bottom" } })`
- **Split line reveal on scroll** → `SplitLinesReveal`
  - `fromTo(lines, { yPercent:101 }, { yPercent:0, duration:1.25, stagger:0.2, ease:"expo", scrollTrigger:{ trigger: el } })`
- **Scrubbed parallax translateY** → `ParallaxY`
  - `fromTo(el, { y: from }, { y: to, ease:"none", scrollTrigger:{ trigger: parent, scrub:true } })`
- **Scrubbed parallax yPercent (hero)** → (planned) `ParallaxYPercent`
  - Example in their code: `.js-p-hero` `yPercent: 0 → 25`, `scrub:true`, `start:"top top"`
- **Scrubbed rotation** → `RotateOnScroll`
  - `fromTo(el, { rotation:0 }, { rotation:-270, ease:"none", scrub:true })`
- **Accordion/dropdown height tween** → `AccordionHeight`
  - Timeline defaults `duration:.5`, `ease:"expo.inOut"` and `height: 0 → auto`
- **Mobile menu open** → (planned) `MobileMenuReveal`
  - Overlay `yPercent` in from `[-100, 100]` to `0`
  - Borders scaleX `0 → 1` with `duration:1.25`, `stagger:.075`, `ease:"expo"`
  - Items `yPercent:100 → 0` with the same timing
- **LogoWall loop** → (planned) `LogoWall`
  - `repeat:-1`, `repeatDelay` attribute, play/pause via ScrollTrigger enter/leave
- **Marquee** → (planned) `Marquee`
  - Controlled by `data-marquee-*` and responsive multiplier (breakpoints `479` / `991`)

### `ScrollFadeUp`

Motto pattern (used for lists/cards):  
`y: 60, opacity: 0` → `y: 0, opacity: 1`, `duration: 1`, `ease: "power2.out"`, `delay: 0.1 * index`, `start: "top bottom"`.

Usage:

```tsx
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";

<ScrollFadeUp index={0}>
  <div>Card</div>
</ScrollFadeUp>
```

### `SplitLinesReveal`

Motto pattern (their `[data-split]`):  
Split into lines, set overflow hidden, then animate:
`yPercent: 101` → `yPercent: 0`, `duration: 1.25`, `stagger: 0.2`, `ease: "expo"`, `scrollTrigger: { trigger: el }`.

Usage:

```tsx
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";

<SplitLinesReveal>
  <h2>Ideas worth rallying around</h2>
</SplitLinesReveal>
```

### `ParallaxY`

Motto pattern:
`fromTo(el, { y: "-10rem" }, { y: "10rem", ease:"none", scrub:true, trigger: parent })`.

Usage:

```tsx
import { ParallaxY } from "@/motion/ParallaxY";

<ParallaxY range={["-10rem", "10rem"]}>
  <div>Parallax layer</div>
</ParallaxY>
```

### `RotateOnScroll`

Motto pattern:
`rotation: 0` → `rotation: -270`, `ease:"none"`, `scrub:true`.

Usage:

```tsx
import { RotateOnScroll } from "@/motion/RotateOnScroll";

<RotateOnScroll>
  <svg>{/* ... */}</svg>
</RotateOnScroll>
```

### `AccordionHeight`

Motto pattern:
height tween `0` → `auto` using a timeline with `duration: .5`, `ease: "expo.inOut"`.

Usage:

```tsx
import { AccordionHeight } from "@/motion/AccordionHeight";

<AccordionHeight summary="Open">
  <div>Content</div>
</AccordionHeight>
```

### `SmoothScrollLenis`

Wraps the app in a Lenis RAF loop.

Usage:

```tsx
import { SmoothScrollLenis } from "@/motion/SmoothScrollLenis";

<SmoothScrollLenis>
  {children}
</SmoothScrollLenis>
```

### `ScrollGrowToContainer`

Motto-style “screen grows on scroll” behavior:
- Starts scaled down
- Scrubs up to a computed scale that matches the container width (measured at refresh time)
- Optionally pins the wrapper while scaling

Usage:

```tsx
import { ScrollGrowToContainer } from "@/motion/ScrollGrowToContainer";

<ScrollGrowToContainer pin start="top center" end="+=140%">
  <div>{/* image/video */}</div>
</ScrollGrowToContainer>
```

### `ScrollGrowDockPin`

Motto-like “screen grows, then docks into a new position” (single element):
- Pin the media while scrubbing
- Grow towards the container width
- Then shrink + move into a dock target element
- Remains pinned at that docked position while scrolling through the section

Usage:

```tsx
import { ScrollGrowDockPin } from "@/motion/ScrollGrowDockPin";

<ScrollGrowDockPin
  dockTargetSelector="[data-gs-home-media-target]"
  pinUntilSelector="[data-gs-home-harmony]"
  start="top center"
  dockAt="top center"
>
  <div>{/* image/video */}</div>
</ScrollGrowDockPin>
```

---

## Next items to mirror (not implemented yet)

These are visible in Motto’s code and should be added if we want complete parity:

- **Marquee** (`data-marquee-collection-target`, `data-marquee-scroll-target`) with responsive speed multiplier (breakpoints 479 / 991).
- **LogoWall** loop (`data-logo-wall-*`) with shuffle + repeat timeline + ScrollTrigger play/pause.
- **Mobile menu reveal** (overlay slide + border scaleX + item yPercent stagger with `ease:"expo"`).
- **Hover reveal masks/lines** (timeline controlling line scaleX and masked content y).
- **Pinned/clipPath section reveal** (scroll-scrubbed clipPath inset to 0, plus caption slide).
- **Draggable sliders** (infinite slider behavior using GSAP Draggable).
- **Route transitions** (Motto uses Highway; we’ll map this to Next route transitions).

