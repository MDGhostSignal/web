# Session Log - April 14, 2026

## Summary
Major enhancements to the Who Are We page and refactoring of the ContactSection into a shared component.

## Changes Made

### 1. Who Are We Page - Cloud Animations
- Converted cloud animations from `top`/`left` positioning to GPU-accelerated `transform: translate3d()` for smoother performance
- Added cloud animations to three sections:
  - Hero section (5 clouds, 2 layers - background and foreground)
  - Founders section (5 clouds, 2 layers)
  - We Promise section (3 clouds)
- Used cubic-bezier easing for natural movement
- Added `prefers-reduced-motion` support for accessibility

### 2. Spline Embed Watermark Removal
- Modified `SplineEmbed.tsx` to access shadow DOM and hide Spline UI elements
- Injected CSS into shadow root to hide:
  - Logo/watermark
  - Drag/cursor hints
  - Interaction overlays
- Multiple timeout attempts to handle slow loads

### 3. Partner-Making Force Animation
- Created animated "PARTNER-MAKING FORCE" headline with:
  - SVG hand icons that slide in from sides
  - Single clap moment with comic book burst effect
  - Hyphen stretch animation after clap
  - Text reveal animation
- Positioned hands relative to hyphen for proper alignment

### 4. Founder Modals Enhancement
- Changed avatar from circle to vertical rectangle with rounded corners (80x100px)
- Updated LinkedIn button to outline style (transparent bg, black border)
- Left-aligned button, pure black on hover
- Removed email signature section from modals

### 5. We Promise Section Redesign
- Added visual header with black circle and color bars PNG
- Created 3-column layout:
  - Column 1: Stacked text boxes with hover animation
  - Column 2 & 3: Promise images with static noise overlay
- Changed closing text to H2 all caps styling
- Added cloud animation background

### 6. ContactSection Component Refactor
Created new shared component at `src/components/ContactSection/`:

**Files created:**
- `ContactSection.tsx` - Main component with optional props
- `ContactSection.module.css` - Styles with pure black background
- `index.ts` - Export file

**Key changes:**
- Background changed from `var(--gs-tw-gray-950)` (had blue tint) to `#000000` (pure black)
- Component accepts optional `imageSrc` and `imageAlt` props
- Full responsive styles included

**Pages updated:**
- `/who-are-we` - Uses default image
- `/for-advertisers` - Uses custom image path
- `/for-creators` - Uses default image

**CSS cleanup:**
- Removed ~115 lines from `who-are-we/page.module.css`
- Removed ~115 lines from `for-advertisers/page.module.css`
- Removed ~115 lines from `for-creators/page.module.css`

**Not changed:**
- `/get-in-touch` - Left as-is (different use case - destination page with form)

## Files Modified
- `apps/web/src/app/who-are-we/page.tsx`
- `apps/web/src/app/who-are-we/page.module.css`
- `apps/web/src/app/who-are-we/FoundersSection.tsx`
- `apps/web/src/app/who-are-we/SplineEmbed.tsx`
- `apps/web/src/app/for-advertisers/page.tsx`
- `apps/web/src/app/for-advertisers/page.module.css`
- `apps/web/src/app/for-creators/page.tsx`
- `apps/web/src/app/for-creators/page.module.css`

## Files Created
- `apps/web/src/components/ContactSection/ContactSection.tsx`
- `apps/web/src/components/ContactSection/ContactSection.module.css`
- `apps/web/src/components/ContactSection/index.ts`
- `apps/web/public/images/who-are-we/promise1.jpg`
- `apps/web/public/images/who-are-we/promise2.jpg`

## Commit (Session 1)
```
feat(who-are-we): enhance page with animations and refactor ContactSection
```

---

# Session 2 - Footer & Snowdrift Updates

## Summary
Enhanced the Footer component with animations and hover effects, fixed social icons, updated Snowdrift page to link to Substack, removed navigation from Get in Touch page, and fixed header visibility issues.

## Changes Made

### 7. Footer Enhancements (`Footer.tsx`, `Footer.module.css`)

**Converted to Client Component:**
- Added `"use client"` directive to support GSAP animations
- Imported `ScrollFadeUp` for scroll-triggered reveal animations

**Animation Updates:**
- Added staggered `ScrollFadeUp` animations to all footer elements
- Logo (index 0), section titles (index 1), links (index 2-3), morse code (index 4), social icons (index 5-7)

**Visual Changes:**
- Centered social icons below morse code (changed from `flex-end` to `center`)
- Made spinning logo clickable (links to home page)
- Added hover effect on logo: `scale(1.15)` transform
- Added hover effects on footer links: slide right (`translateX(8px)`) + color change to `#80838d`
- Removed the written-out GhostSignal wordmark from right side

### 8. Fixed Social Icons
Replaced corrupt/broken SVG icons:

**Facebook (`social-facebook.svg`):**
- Was displaying as single pixel
- Replaced with proper Facebook "F" outline icon

**LinkedIn (`social-linkedin-outline.svg`):**
- Was displaying incorrectly
- Replaced with proper LinkedIn outline icon with person and connection paths

### 9. Snowdrift Page Updates (`snowdrift/page.tsx`, `snowdrift/page.module.css`)

**Removed Email Signup Forms:**
- Removed email input field and subscribe button form elements

**Added Substack Link:**
- Single "Subscribe on Substack" button linking to `https://snowdriftghostsignal.substack.com/`
- Styled button with `display: inline-block` for anchor element

**Removed Bottom CTA Section:**
- Entire second signup section removed

### 10. Get in Touch Page (`get-in-touch/page.tsx`)
- Removed `SiteHeader` component import and usage
- Removed unused `navLinks` constant
- Page now displays without navigation bar

### 11. Header Visibility Fix (`SiteHeader.tsx`)
**Issue:** When clicking footer logo to navigate home, the navigation bar remained hidden (stuck at `yPercent: -100` from scroll-triggered hide animation).

**Fix:** Added initial state reset in `useIsomorphicLayoutEffect`:
```tsx
const el = rootRef.current;
if (el) gsap.set(el, { yPercent: 0 });
```
This ensures the header is visible on page load/navigation.

## Files Modified (Session 2)
- `apps/web/src/components/Footer.tsx` - Client component, animations, logo link
- `apps/web/src/components/Footer.module.css` - Centered icons, hover effects, removed wordmark styles
- `apps/web/src/components/SiteHeader.tsx` - Header visibility fix
- `apps/web/src/app/snowdrift/page.tsx` - Substack link, removed forms
- `apps/web/src/app/snowdrift/page.module.css` - Button styling for anchor
- `apps/web/src/app/get-in-touch/page.tsx` - Removed navigation
- `apps/web/public/images/home/figma/social-facebook.svg` - Fixed icon
- `apps/web/public/images/home/figma/social-linkedin-outline.svg` - Fixed icon

## Technical Notes

### Footer Header Hide Pattern
The footer uses the `js-s-hide-sh` class which triggers a `ScrollTrigger` in `SiteHeader.tsx` to hide the header when the footer is in view. This prevents the "Get in Touch" navigation button from being visible over the footer.

### Animation Stagger Pattern
Footer elements use incrementing `index` values with `ScrollFadeUp` to create a cascading reveal effect as the user scrolls down to the footer.

## Commit (Session 2)
```
feat: footer enhancements, Snowdrift updates, and various fixes
```

Pushed to: `origin/main` (https://github.com/MDGhostSignal/web.git)
