# Session Log - April 16, 2026

## Summary
Enhanced the homepage hero animations with staggered reveals, improved navbar animations globally, fixed scrollbar layout shift, and added Monster Headline typography token. Later, major enhancements to the "What Is This" page including split-screen hero, 3D globe with orbital rings, twinkling starfield, and various animation improvements.

## Part 1: Homepage Enhancements

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

---

## Part 2: "What Is This" Page Major Enhancements

### 6. Split-Screen Hero Section
- Created split-screen hero with white left panel (text) and image right panel
- Added GSAP scroll animation that slides panels apart on scroll (white to left, image to right)
- Left panel: Black text on white background with staggered headline animations
- Right panel: Full-bleed image (`top.jpg`) with TV static overlay effect
- Added lettermark logos as decorative framing above headline
- Headline split into two lines with SplitLinesReveal animations
- Subtitle in all caps, non-italic, split into two lines

### 7. TV Static Flicker Overlay
- Added noise pattern overlay on hero image using base64 PNG
- Subtle opacity animation (12-18%) with 4-step flicker
- Mix-blend-mode: overlay for realistic CRT effect

### 8. BrandedGhostSignal Component (New)
- Created reusable component for consistent brand typography
- "GHOST" rendered in bold, uppercase
- "Signal" rendered in thin weight (100), mixed case
- Supports color variants: light, dark, inherit
- Used in "Who is GhostSignal" section and whitepaper CTA

### 9. Harmony Circles Animation
- Added two animated circles behind "harmony" headline
- Magnetic push/pull animation over 16 seconds
- Creates visual representation of values alignment

### 10. 3D Globe with Orbital Rings (Major Feature)
- Added 5 orbital rings around the Earth globe in ScrollScenes
- Each ring uses a brand color:
  - Ring 1 (innermost): Red #D66157
  - Ring 2: Purple #9F71AF
  - Ring 3: Green #00B29C
  - Ring 4: Pink #FF7BAD
  - Ring 5 (outermost): Orange #FBAD25
- Rings are ultra-thin (~1-2px) with subtle wavy pattern
- Tilted at 10° X-axis and -40° Z-axis for diagonal appearance (bottom-left to top-right)
- Slow rotation animation (~60 seconds per full rotation)
- Ring radii: 1.50x to 1.98x globe radius
- Added `scale` prop to ScrollScenes for camera zoom control (set to 0.88)

### 11. Twinkling Starfield Animation
- Enhanced ParallaxBackground starfield with twinkling effect
- Two star layers with different animation timings:
  - Layer 1: 4s cycle, opacity 0.3 to 1.0
  - Layer 2: 6s cycle, opacity 0.4 to 1.0 (opposite phase)
- Creates natural twinkling effect where stars brighten/dim independently

### 12. Whitepaper Section Improvements
- Changed "GhostSignal" to use BrandedGhostSignal component
- Moved section up closer to 3D globe (negative top margin)
- Adjusted spacing for smooth transition to footer

### 13. SplitLinesReveal Fix
- Increased initial yPercent from 101 to 110
- Prevents visible pixels before animation starts

## Files Modified
- `apps/web/src/app/page.tsx` - Staggered headline animations, navbar animateIn
- `apps/web/src/app/page.module.css` - heroLine class, Monster Headline M1 size
- `apps/web/src/app/globals.css` - scrollbar-gutter fix
- `apps/web/src/app/what-is-this/page.tsx` - Split-screen hero, BrandedGhostSignal usage
- `apps/web/src/app/what-is-this/page.module.css` - Hero styles, harmony circles, layout adjustments
- `apps/web/src/components/SiteHeader.tsx` - animateIn props, logo animation
- `apps/web/src/components/ScrollScenes.tsx` - Orbital rings, scale prop, container fixes
- `apps/web/src/components/ParallaxBackground.module.css` - Twinkling starfield animation
- `apps/web/src/motion/ScrollFadeUp.tsx` - Added delay prop
- `apps/web/src/motion/SplitLinesReveal.tsx` - Increased yPercent to 110
- `apps/web/src/styles/typography.css` - Monster Headline M1 token

## New Files Created
- `apps/web/src/components/BrandedGhostSignal.tsx` - Brand name typography component
- `apps/web/src/components/BrandedGhostSignal.module.css` - Styles for brand component
- `apps/web/public/images/what-is-this/top.jpg` - Hero image
- `apps/web/public/images/what-is-this/lettermark-black.png` - Decorative logo

## Technical Notes

### Orbital Rings Shader Implementation
The rings are rendered in WebGL using ray-disk intersection:
```glsl
// Ring tilt angles
const float RING_TILT_X = 0.1745;  // 10 degrees
const float RING_TILT_Z = -0.70;   // -40 degrees (diagonal)

// Ring radii (thin rings ~0.006 width)
const float RING_INNER_1 = 1.50;
const float RING_OUTER_1 = 1.506;
// ... up to ring 5 at 1.98

// Wavy pattern on ring edges
float wave = sin(angle * 12.0 + uTime * 0.3) * 0.002 +
             sin(angle * 7.0 - uTime * 0.2) * 0.0015;
```

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

---

## Part 3: Design Tasks Enhancements

### 14. Commenter Selector in Task Panel
- Added dropdown selector to choose which founder to comment as
- Clickable avatar button with dropdown indicator
- Shows all 4 founders with their colored avatars
- Selected commenter highlighted in dropdown
- Placeholder text updates to show selected commenter name
- Click outside closes dropdown

### 15. New Comment Indicator on Task Cards
- API now returns `latest_comment_at` timestamp per task
- localStorage tracks when user last viewed each task's comments
- Task cards show visual indicators for new/unread comments:
  - Green "NEW" badge next to comment count
  - Green left border highlight on card
  - Pulsing glow animation on comment count
  - Comment count changes from blue to green
- Indicators clear when user opens the task

### 16. Temporary Design Feedback Button (Homepage)
- Added fixed-position button in top-right corner
- Signal red color (#D66157) with hover effects
- Links to `/design-tasks` page
- Easy to remove later (just delete the Link and CSS)

## Additional Files Modified (Part 3)
- `apps/web/src/app/api/design-tasks/route.ts` - Added latest_comment_at to API response
- `apps/web/src/app/design-tasks/TaskDetailPanel.tsx` - Commenter selector dropdown
- `apps/web/src/app/design-tasks/TaskDetailPanel.module.css` - Commenter picker styles
- `apps/web/src/app/design-tasks/page.tsx` - New comment tracking with localStorage
- `apps/web/src/app/design-tasks/page.module.css` - New comment indicator styles
- `apps/web/src/app/page.tsx` - Temporary design feedback button
- `apps/web/src/app/page.module.css` - Design feedback button styles

### Technical Notes (Part 3)

#### New Comment Detection
```typescript
// localStorage key for tracking
const VIEWED_COMMENTS_KEY = "ghostsignal_viewed_comments";

// Check if task has new comments
function hasNewComments(task: Task, viewedComments: Record<string, string>): boolean {
  if (!task.latest_comment_at || task.comment_count === 0) return false;
  const lastViewed = viewedComments[task.id];
  if (!lastViewed) return true; // Never viewed = new
  return task.latest_comment_at > lastViewed;
}
```

#### Founder Colors (for commenter selector)
- Mike Sense: #8b5cf6 (purple)
- Jack W Harding: #3b82f6 (blue)
- Martin Drexler: #10b981 (green)
- Jeremy Reeves: #f59e0b (amber)
