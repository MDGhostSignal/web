# Session Log - April 16, 2026

## Summary
Enhanced the homepage hero animations with staggered reveals, improved navbar animations globally, fixed scrollbar layout shift, and added Monster Headline typography token.

## Changes Made

### 1. Hero Headline Staggered Animation
- Split the hero headline into two separate `SplitLinesReveal` animations
- Line 1: "GhostSignal is for people" - animates immediately
- Line 2: "who are making the world." - animates with 1.5s delay
- Added `.heroLine` CSS class for proper block display

### 2. Hero Subtitle & Button Timing
- Added `delay` prop to `ScrollFadeUp` component for fixed timing delays
- Subtitle and "Learn more" button now appear after headline animation completes (3.0s delay)
- Button staggers 0.14s after subtitle via index prop

### 3. Navbar Animation Enhancements (`SiteHeader.tsx`)
- Added `animateIn` prop to trigger entrance animation on mount
- Added `animateInDelay` prop for timing control
- Logo now included in all animations (fade in/out with links)
- Added `logoRef` to track logo element
- Logo animates in first, links follow with 0.05s stagger
- Applied `animateIn` to homepage navbar

### 4. Scrollbar Layout Shift Fix (`globals.css`)
- Added `scrollbar-gutter: stable` to `html` element
- Prevents navbar link position shift between pages with/without scrollbars
- Consistent layout across all pages regardless of content length

### 5. Monster Headline M1 Token (`typography.css`)
- Created new "Monster Headlines" section in typography system
- Added `.text-monster-1` class: `clamp(35px, 6.6vw, 88px)`
- 10% larger than standard hero headline (32px/6vw/80px)
- Applied to homepage hero headline

## Files Modified
- `apps/web/src/app/page.tsx` - Staggered headline animations, navbar animateIn
- `apps/web/src/app/page.module.css` - heroLine class, Monster Headline M1 size
- `apps/web/src/app/globals.css` - scrollbar-gutter fix
- `apps/web/src/components/SiteHeader.tsx` - animateIn props, logo animation
- `apps/web/src/motion/ScrollFadeUp.tsx` - Added delay prop
- `apps/web/src/styles/typography.css` - Monster Headline M1 token

## Technical Notes

### Animation Timeline (Homepage)
1. **0.0s** - Logo starts animating in
2. **0.05s** - Nav links start animating in (staggered)
3. **0.0s** - Line 1 headline starts reveal
4. **1.5s** - Line 2 headline starts reveal
5. **3.0s** - Subtitle fades up
6. **3.14s** - Button fades up (0.14s stagger)

### ScrollFadeUp Delay Prop
The delay is additive with the index-based stagger:
```typescript
delay: delay + 0.14 * index
```

### Scrollbar Gutter
`scrollbar-gutter: stable` reserves space for scrollbar on all pages, preventing ~15-17px layout shift on Windows when navigating between pages with different content lengths.
