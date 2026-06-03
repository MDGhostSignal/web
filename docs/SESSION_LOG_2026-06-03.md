# Session Log — 2026-06-03

Wide-ranging CRM polish session driven by Jack's feedback on a
demo walk-through. Two structural changes (collapsible sidebar v2,
keyboard-shortcut system), two CRM features (contacts traffic-light
lifecycle, tasks index-card layout), and a handful of bug fixes /
removals around alerts the team found too noisy.

## 1 · Contacts list — sorting, lifecycle clicking, perf

Three asks on `/admin/contacts`:

1. **Sortable columns** — added `sort` comparators to Name and
   Organization (DataTable already had the sort infra; Type and
   Owner already used it). Empty values fall to the bottom on asc,
   matching the existing Owner column behaviour.
2. **Clickable lifecycle circles** in the expanded view —
   `ContactLifecycleStepper.tsx` gained an optional `onSetStatus`
   prop; when provided, each full-variant circle renders as a
   `<button>` whose click flips the underlying member fields. The
   compact stepper in the row stays read-only.
3. **Stutter on expand** — root cause was every visible row
   re-rendering the compact stepper whenever `expandedRow` changed
   (200+ rows × full restripe). Fixed by wrapping
   `ContactLifecycleStepper` in `React.memo` with a custom equality
   check on only the four fields the stepper actually reads.

## 2 · Contacts traffic-light lifecycle (Jack's v2 spec)

Rewrote the contact lifecycle stepper to the four-stage traffic
light Jack asked for:

1. **Discern** — gray (waiting)
2. **Reached out** — yellow (awaiting reply)
3. **Replied — no** — red (rejected)
4. **Replied — interested** — green (positive)

### Data model

New column `members.response_kind text` with check constraint
`('no', 'interested')`. Free-text `last_response` stays as the
place for actual reply context; `response_kind` is the categorical
signal that drives the stepper + filter dropdown.

- **`docs/CRM_MEMBERS_RESPONSE_KIND_MIGRATION.sql`** (new) — adds
  the column + constraint, idempotent.
- **`apps/web/src/lib/members.ts`** — `Member` type gains
  `response_kind: 'no' | 'interested' | null`.
- **`apps/web/src/app/api/members/route.ts`** — `sanitizePayload`
  enum-validates `response_kind`, accepts `null` to clear.

### Derivation + "untouched" discriminator

`deriveStatus()` in `ContactLifecycleStepper.tsx` now returns one
of seven values: `untouched | discern | reached-out | replied-no |
replied-interested | member | stopped`. The discriminator between
`untouched` (brand-new row, all circles hollow) and `discern`
(founder explicitly triaged) is
`lifecycle_steps.discernment.status === "done"` — written on every
explicit traffic-light click via the new `withDiscernmentDone()`
helper in `page.tsx`. Without that marker, a fresh DB row (phase
defaults to `discern`) would auto-display as the discern state,
which is exactly what Jack complained about.

### Rendering

- Full variant: flat row of four colour-coded circles with
  connectors. Active circle is filled with its tint AND ringed
  (current = done-fill + ring) so the "you are here" indicator
  matches what the row pip in the overview shows.
- Compact variant: 4-pip bar with per-tint colours. Label reads
  `X/4 · Status name` (or `0/4 · Not started` when untouched).
- The Phase filter on the contacts overview was retitled "Status"
  and rebuilt to map over `DERIVED_STATUSES` directly — adding a
  new status is one-line.

### CSS

`contacts.module.css` got tint-aware circle styling via
`data-tint="neutral|warn|danger|success"` so the four traffic-light
colours all share the same circle shape but read distinctly.
Existing `.stepperFullCircleDone` / `.stepperFullCircleCurrent`
classes remain; the tinted attribute selectors take precedence.

## 3 · Sidebar v2 — collapsible icon-rail

Two complementary changes to `AdminShell` + `AdminSidebar`.

### Scroll bug fix

`AdminShell.module.css` swapped `overflow-x: hidden` →
`overflow-x: clip` on `.shell`. The old `hidden` value normalised
`overflow-y` to `auto`, making `.shell` a competing scroll
container — broke `position: sticky` on the topbar and `position:
fixed` sync of the sidebar on tall pages, especially on small
viewports. `clip` clips without creating a scroll container
(Safari 16+, all evergreens).

### Collapsible sidebar

`AdminShell` owns a `collapsed` state, hydrated from `localStorage`
key `gs-admin-sidebar-collapsed` and toggled via Ctrl/⌘+B (skipped
inside text inputs / contentEditable). Drives a CSS variable
`--admin-sidebar-width` on `.shell` (256 px expanded, 64 px
collapsed). The sidebar reads the var for its own width; the
content column reads it for `margin-left`. 200 ms ease-out
transition; `prefers-reduced-motion` honoured.

`AdminSidebar` reflowed to `flex-direction: column` so the nav
list scrolls in the middle while the collapse-toggle pins to the
top above the nav (Jack asked for it at the top — initial
implementation had it bottom-pinned). Renamed the supporting
CSS class `.footer` → `.toggleBar` after the move.

Collapsed-mode rules are scoped under `@media (min-width: 769px)`
so the mobile drawer is unaffected — drawer keeps its 280 px
width, full labels, and existing close button regardless of the
stored desktop preference.

## 4 · Tasks tab — index-card layout + assignee colour

Jack's three asks on `/admin/tasks` (the fourth, auto-archiving
completed tasks, deferred):

1. **"Index card feel"** — `taskList` grid dropped from
   `minmax(280px, 1fr)` → `minmax(220px, 1fr)`. `.taskCard`
   `min-height` 180 → 140 px, padding `space-4` → `space-3`.
   Result: 4–5 cards per row on a typical content column.
2. **Per-assignee colour stripe** — added a 4 px `::before` stripe
   on the top edge of each card, coloured by a per-founder CSS
   variable `--task-assignee` driven by `data-assignee` attribute
   on the card. Palette deliberately reuses 4 of the 5 stripes
   from the membership welcome card:
   - Mike Sense → cyan `#4dc9ae`
   - Jack W Harding → purple `#b388f0`
   - Martin Drexler → coral `#fa7b3f`
   - Jeremy Reeves → pink `#fa88b0`

   Yellow (the 5th stripe) is deliberately skipped to avoid
   collision with `--admin-warn` used on in-progress status
   borders.
3. **Status colour preserved** — left border still encodes status
   (pending / in_progress / completed / etc.) exactly as before;
   the new assignee stripe is additive. The sidebar Assignee
   filter chips now show a small colour dot so the per-card
   stripe palette reads as a documented legend.

## 5 · Keyboard shortcuts + help popover

New component `apps/web/src/components/admin/ShortcutHelp.tsx`
(+ matching CSS module) lives in the topbar trail next to the
AlertsBell. Three responsibilities, self-contained:

1. **`?` icon button** — hover shows native tooltip
   "Keyboard shortcuts (?)"; click toggles a popover anchored to
   it. ESC or click-outside closes.
2. **Popover panel** — lists every shortcut grouped Navigation /
   Global, with proper `<kbd>` chip styling.
3. **Global key listeners** — `?` opens the popover from anywhere;
   `g` then a letter navigates Linear-style. Both bail when focus
   is in `INPUT` / `TEXTAREA` / `SELECT` / contentEditable, and
   any Ctrl/Cmd/Alt-modified key is left to the owning binding
   (so Ctrl+B sidebar toggle still works).

### Chord map

`g` then: `d` Dashboard · `c` Contacts · `m` Marketplace · `r` RQ ·
`x` XQ · `t` Tasks · `k` mar**K**eting · `f` Finance · `a` ART19 ·
`o` c**O**ntracts · `n` Alerts. 1.5 s timeout; ESC cancels.

C/O split resolves the Contacts/Contracts conflict; K avoids the
M collision with Marketplace. The `NAV_SHORTCUTS` array drives
both the listener and the popover, so the help dialog can't drift
from what actually works. Adding a new admin tab = one line in
that array.

A new `IconHelp` (question mark in a circle) was added to
`icons.tsx` following the existing inline-SVG pattern.

## 6 · Marketplace + contacts cleanup (alerts removal)

Jack found two in-page urgent banners too noisy.

- **Contacts page** — removed the "Urgent contacts" banner that
  fired at 7 days of no contact. Helpers (`URGENT_DAYS`,
  `isUrgent`, `urgencyScore`, `urgent` memo, `handleResolveUrgent`,
  `openLead`, the whole `UrgentLeadsBanner` component) all
  stripped. Jack remembered it as "3-day" but it was 7; flagged
  the discrepancy.
- **Marketplace pool** — same treatment. Removed the
  `MarketplaceUrgentBanner` and its supporting helpers
  (`nextPendingStep`, `isMemberUrgent`, `memberUrgencyScore`,
  `urgentMembers`, `openMember`, `resolveMember`). Dropped
  now-unused imports (`daysSince`, `LIFECYCLE_STEPS`,
  `MARKETPLACE_LIFECYCLE_KEYS`, `MEMBER_PHASE_LABELS`,
  `StaleBadge`, `useCallback`).

The 30-day **marketplace_stall** alert in the global Alerts bell
and the daily 8 AM digest cron both stay in place — that's the
"one-month" notification path Jack said he wanted to keep. Env
var `ALERT_MARKETPLACE_STALL_DAYS` tunes the threshold.

## 7 · Lifecycle pruning

`lib/members.ts` dropped `upload_to_drive` ("Upload to Drive")
and `label_calendar` ("Label as Calendar") from the
`LIFECYCLE_STEPS` array. Existing rows in Supabase that still
carry those keys in their `lifecycle_steps` JSON are silently
ignored (the renderer iterates `LIFECYCLE_STEPS`, not row keys);
future PATCHes referencing them get dropped by
`sanitizeLifecycleSteps` via the `KNOWN_STEP_KEYS` set. No
migration needed.

## 8 · Membership welcome card z-index fix

`/admin/marketplace?view=pool` expanded member view: the five
diagonal welcome-card stripes were overlaying the member name +
GhostSignal wordmark + logo because `.mmWelcomeCardStripes` had
`z-index: 1` while sibling foreground content had no z-index set
(rendered below positioned siblings in the same stacking
context). Added `z-index: 3` to `.mmWelcomeCardAvatar`,
`.mmWelcomeCardText`, and `.mmWelcomeCardWordmark` — matching the
number badge that was already at z 3 — so all foreground content
sits on a single legible layer above stripes (z 1) and
plastic-shine (z 2).

## Files touched

### New
- `docs/CRM_MEMBERS_RESPONSE_KIND_MIGRATION.sql`
- `apps/web/src/components/admin/ShortcutHelp.tsx`
- `apps/web/src/components/admin/ShortcutHelp.module.css`

### Modified
- `apps/web/src/app/admin/contacts/page.tsx`
- `apps/web/src/app/admin/contacts/ContactLifecycleStepper.tsx`
- `apps/web/src/app/admin/contacts/contacts.module.css`
- `apps/web/src/app/admin/marketplace/PoolView.tsx`
- `apps/web/src/app/admin/marketplace/marketplace.module.css`
- `apps/web/src/app/admin/tasks/page.tsx`
- `apps/web/src/app/admin/tasks/page.module.css`
- `apps/web/src/app/api/members/route.ts`
- `apps/web/src/lib/members.ts`
- `apps/web/src/components/admin/AdminShell.tsx`
- `apps/web/src/components/admin/AdminShell.module.css`
- `apps/web/src/components/admin/AdminSidebar.tsx`
- `apps/web/src/components/admin/AdminSidebar.module.css`
- `apps/web/src/components/admin/icons.tsx`
- `apps/web/src/components/admin/index.ts`

## Deploy / migration checklist

1. **Run the migration in Supabase SQL editor:**
   `docs/CRM_MEMBERS_RESPONSE_KIND_MIGRATION.sql` — required for
   the traffic-light clicks on `/admin/contacts` to save. The
   API returns 502 on PATCH until the column exists.
2. **No other migrations required** — lifecycle-step removal is
   safe without a DB change (renderer reads from
   `LIFECYCLE_STEPS`, sanitiser drops unknown keys).
3. **Asset / settings changes:** none.
4. **Env vars:** none added; existing `ALERT_MARKETPLACE_STALL_DAYS`
   continues to drive the one-month marketplace alert.
