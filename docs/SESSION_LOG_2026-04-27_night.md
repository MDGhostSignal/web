# Session Log — 2026-04-27 (night)

Continuation after the light/dark theme toggle (`a00ff90`). Two
broad arcs: a deep redesign of `/admin/design-tasks` and a deep
redesign of `/admin/marketplace`. Plus a handful of cross-admin
polishes that fell out of light-theme readability gaps.

## /admin/design-tasks — full redesign

### Tile grid

- `.taskList` flipped from vertical flex stack → CSS grid
  (`repeat(auto-fill, minmax(280px, 1fr))`). 4-column on a typical
  1280px content area; 12+ tiles visible on a 1080px viewport.
- Tile padding tightened, title clamped to 2 lines, description
  clamped to 2 lines, meta line dropped to text-xs, action row
  buttons compacted. Per-tile `min-height: 180px` so empty
  placeholders match real-tile height.
- Empty-slot placeholders rendered after real tiles up to
  `MIN_VISIBLE_TILES = 12`. Dashed border, mono-font position
  number at low contrast (text-disabled × opacity 0.5).
- Removed the whole-tile green border + glow pulse for unread
  comments; only the comment-count pill carries the green hint
  now.

### Drag-and-drop reorder

- HTML5 drag/drop on each tile — `onDragStart` records the source
  id, `onDragOver` updates the drop target, `onDrop` calls a
  direction-aware reorder helper.
- Direction fix: `reorderTasks` inserts AFTER the target when the
  source was originally before it, BEFORE the target otherwise.
  The original always-insert-before logic made front-to-back
  drags land in the slot just before the target, looking like the
  drag fell short.
- Order persisted as an array of task ids in localStorage under
  `ghostsignal_design_task_order`. Tasks not yet in the array
  (newly created) sort to the end. Order applies across all
  filter views.

### Status overhaul

- New `archived` status — added to the `TaskStatus` union in both
  `page.tsx` and `TaskDetailPanel.tsx`, dropdowns updated, new
  filter tab "Archived" between Completed and a new In Review.
- New `in_review` status — between Completed and Archived in
  the workflow. Filter tab + dropdown option both wired in. CSS
  classes for the status select use the brand amber accent
  (`status_in_review` / `statusin_review`).
- Status-driven left border on tiles (replaces priority-driven
  border): pending = blue, in_progress = yellow, completed =
  green, in_review = yellow, archived = blue. Priority is still
  surfaced via the priority Badge in the tile header.

### Centred detail modal

- `TaskDetailPanel` flipped from right-anchored slide-in drawer
  (`right: 0; max-width: 560px; full-height`) to a centred modal
  card: `top: 50%; left: 50%`, `width: min(1100px, calc(100vw -
  64px))`, `height: min(900px, calc(100vh - 64px))`. Full border
  + radius + scale-fade entrance keyframe replace the
  translateX-slide.
- Comment thread now has roughly 2× the horizontal room.

### Description + due date UX

- New `LinkifiedText` component in `src/lib/linkify.tsx`. URLs in
  `task.description` render as `<a target="_blank">` with
  `stopPropagation` so clicking a link inside a tile doesn't also
  open the detail panel. Applied in tile + detail panel.
- New `DueDateBadge` (`src/app/admin/design-tasks/DueDateBadge.tsx`)
  with smart relative labels and tier-coloured pill: "Today",
  "Tomorrow", "Yesterday", "In 3d", "5d overdue", or absolute
  "Mar 15" beyond 7 days out. Tiers — overdue (destructive),
  today (accent), soon (warn), later (muted neutral), done
  (struck-through dim for completed/archived). Calendar-icon
  glyph + tooltip with the raw ISO date.
- Quick-set chips above the date picker in the create/edit form —
  Today / Tomorrow / Next week / Clear. `isoDateOffset()` helper
  builds local-date YYYY-MM-DD strings. Native picker stays for
  arbitrary dates.

## /admin/marketplace — full redesign

### Sidebar shell + main content

- `.page` flipped from vertical stack → grid `220px 1fr`. Left
  sidebar carries the Marketplace title + brand-count subtitle,
  vertical view nav (Pool / Match / Map with label + hint per
  item), "How matching works" button, compact stats panel
  (Matches / Brands matched / Creators matched), and a Reset
  button at the bottom. Sticky positioning so it stays visible
  on scroll. Collapses to a horizontal nav row on viewports
  ≤ 900px.
- The `PageHeader` block is gone. Stats moved out of the header
  into the sidebar.
- Page broken out of the AdminShell's centred 1400px max-width
  content box via `width: 100vw; margin-left: calc(50% - 50vw)`.
  Sidebar now sits ~12px from the actual viewport left edge;
  main fills the rest with ~16px right padding.
- `AdminShell .shell` got `overflow-x: hidden` so the 100vw
  full-bleed can't induce a horizontal scrollbar (Chrome / Safari
  count the scrollbar gutter inside 100vw).

### Match-of-the-day integration

- Standalone pinned `.todayPin` button (and ~95 lines of CSS)
  removed from the top of the Match view.
- The suggestion card that corresponds to the global highest-
  resonance unconfirmed pair now carries an inline `★ Match of
  the day` ribbon (top-left corner) plus an inset amber outline.
- New `isMatchOfTheDay()` helper in `MatchBoard` resolves
  whether a given suggested entity is the partner of the global
  top pair given the current anchor.

### Active-anchor visibility

- Rail's active item: 5px amber left-border (was 2px), bolder
  weight, label bumps `text-sm → text-md`, expanded vertical
  padding so the row reads taller. Right-side RQ chip gets the
  amber tint. Padding nudged to keep alignment stable
  across selected/unselected.
- Anchor header simplified: single compact row with just the
  entity name (`text-xl` headline), kind Badge, and RQ-code chip.
  Dropped the multi-row card with eyebrow / blurb / RQ name.
  No background tint — neutral chrome. The active-anchor identity
  is now carried entirely by the rail's strong selected state.

### Algorithm explainer modal

- Inline algorithm card replaced with a content-rich Modal
  triggered by a "How matching works" button in the sidebar.
- Modal widened beyond the shared `xl` (880px) cap via a new
  optional `className` prop on the Modal primitive — marketplace
  passes a `helpModalWide` class with `max-width: min(1200px,
  calc(100vw - var(--admin-space-8)))`.
- Content: lede, worked example (Stoneridge Coffee Co. × Holly
  Stallcup with their trait scores + tags as two coloured
  cards), axis-alignment visual (three horizontal tracks with
  brand-orange + creator-cyan markers at score percentages,
  per-axis Δ to the right), step-by-step math walk-through in
  monospace, tier breakdown (now a 3-column grid of cards —
  Strong / Fair / Weak), tags section, "what changes next" note.

### Algorithm change — tag overlap

- `resonance(a, b)` in `marketplace-match.ts` extended with a
  tag-overlap bonus. Each shared tag (case-insensitive) adds
  `TAG_BONUS_PER_SHARED = 2`, capped at `TAG_BONUS_MAX = 6`.
  Final score still clamped 0–100. New `countSharedTags()`
  helper exported.
- Effect: tag overlap can lift a fair match into strong territory
  but can't override poor trait alignment. Makes the score
  scoring respond meaningfully to the shared genre / topic /
  medium vocabulary instead of using tags as display-only metadata.

### Card outline cleanup

- Tier-coloured outlines removed from `.partnerCard_strong`,
  `.partnerCard_fair`, `.partnerCard_weak` — they all use the
  same neutral border now. The resonance ring inside each card
  carries the tier signal; doubling it on the outline made the
  grid noisy. Confirmed-partner cards keep their success-soft
  background (state change, not tier).
- Match-of-the-day ribbon + inset outline preserved.

## Cross-admin polishes

### Brand SVG logo

- New asset: `public/images/brand/ghostsiggnal-admin-hor-4c.svg`.
- Replaced the "GhostSignal" + "Admin" text in the topbar with
  the SVG. Switched from `next/image` to a plain `<img>` —
  next/image's enforced width/height attributes were colliding
  with my CSS overrides and clipping the bottom of the glyphs.
  Bumped `.brandLogo { height: 22px }` and added
  `overflow: visible`.

### Light-theme accent fixes

- Darkened light-theme tokens that were unreadable on white as
  badge / pill text:
  - `--admin-success` `#50ff96 → #0a7a3c`
  - `--admin-warn` `#ffc864 → #a16207`
  - `--admin-info` `#64c8ff → #0369a1`
  - `--admin-type-creator` `#64c8ff → #0369a1`
  - `--admin-type-brand` `#ff9664 → #c2410c`
  - `--admin-error-text` `#ffb4b4 → #a01818`
- Brand amber tuned: `--admin-accent` `#fbad25 → #d4900f`,
  `--admin-accent-strong` `#ffc043 → #b87500`. First attempt at
  `#b45309 / #92400e` was too dark; these keep the same hue +
  saturation, just drop ~10 lightness points.

### Light-theme overlay + expanded-row backdrop

- New `--admin-row-detail-bg` token: dark `rgba(0,0,0,0.3)` →
  light `#ffffff`. DataTable expanded rows are now pure white in
  light theme instead of dark grey.
- New `--admin-modal-overlay-bg` token: dark `rgba(0,0,0,0.5)` →
  light `rgba(15,23,42,0.22)`. Both `Modal` (shared admin) and
  `TaskDetailPanel`'s overlay backdrops use this token now —
  modals in light mode no longer feel like night behind a
  daytime card.

## Files touched

| Area | Paths |
|------|-------|
| design-tasks | `apps/web/src/app/admin/design-tasks/page.tsx`, `.../page.module.css`, `.../TaskDetailPanel.tsx`, `.../TaskDetailPanel.module.css`, `.../DueDateBadge.tsx` (new), `.../DueDateBadge.module.css` (new) |
| marketplace | `apps/web/src/app/admin/marketplace/page.tsx`, `.../marketplace.module.css`, `.../MatchBoard.tsx` |
| matching algorithm | `apps/web/src/lib/marketplace-match.ts` |
| linkify lib (new) | `apps/web/src/lib/linkify.tsx` |
| admin shell | `apps/web/src/components/admin/AdminShell.tsx`, `.../AdminShell.module.css` |
| modal | `apps/web/src/components/admin/Modal.tsx`, `.../Modal.module.css` |
| tokens | `apps/web/src/components/admin/tokens.css` |
| logo asset | `apps/web/public/images/brand/ghostsiggnal-admin-hor-4c.svg` (new) |
| docs | `docs/SESSION_LOG_2026-04-27_night.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| Manual browser walkthrough | ⏳ user iterated through every change live in dev |

## Closing state

- Branch: `a00ff90` → next commit pending (this work).
- `/admin/design-tasks` and `/admin/marketplace` are both heavily
  reorganised; the rest of `/admin/*` picks up the cross-admin
  token + modal-overlay polishes for free.
- Brand amber is now usable in light theme; semantic-soft badges
  read across themes.
