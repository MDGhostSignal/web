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
- **Scrubbed rotation** → (not currently implemented; add back as `RotateOnScroll` if a design calls for it)
- **Accordion/dropdown height tween** → (not currently implemented; add back as `AccordionHeight` if needed)
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

> **Removed primitives.** Earlier iterations also shipped `RotateOnScroll`,
> `AccordionHeight`, `SmoothScrollLenis`, `ScrollGrowToContainer`, and
> `ScrollGrowDockPin`. They had no active consumers as of the 2026-04-19
> audit and were deleted. Re-add them if a future design genuinely needs
> them — the Motto patterns they mirrored are still documented above.

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

