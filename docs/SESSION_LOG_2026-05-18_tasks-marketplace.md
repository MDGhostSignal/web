# Session Log — 2026-05-18 (tasks + marketplace)

Third phase of the day. Morning: /what-is-this hero. Afternoon:
admin/leads overhaul (see `SESSION_LOG_2026-05-18_admin.md` +
`_addendum.md`). This phase: rename Design Tasks → Tasks with
assignee filtering, then a substantial revamp of the marketplace
pool so it mirrors the leads card structure for full GhostSignal
members.

## 1. Design Tasks → Tasks

### Rename + assignee field

- `git mv apps/web/src/app/admin/design-tasks/` →
  `apps/web/src/app/admin/tasks/` (all 6 files renamed in place;
  history preserved).
- `admin/layout.tsx` tab: `{ href: "/admin/design-tasks", label:
  "Design Tasks" }` → `{ href: "/admin/tasks", label: "Tasks" }`.
- Page-module CSS comment header + the form `id`
  (`design-task-form` → `task-form`) updated. Kept the API route
  at `/api/design-tasks`, the DB tables (`design_tasks` +
  `design_task_comments`), and the `localStorage` key
  `ghostsignal_design_task_order` (renaming the key would wipe each
  founder's saved task ordering). Same pattern as the prior
  Members→Leads rename.
- New `assigned_to text` column on `design_tasks` plus a partial
  index (`WHERE assigned_to IS NOT NULL`) — migration in
  **`docs/TASKS_ASSIGNED_TO.sql`**. Safe to re-run.
- API (`/api/design-tasks/route.ts`): `TaskPayload` gains
  `assigned_to?: string | null`; POST writes it through, PATCH
  propagates it.
- Task form: new **Assigned To** dropdown sits next to **Created By**
  in a `formRow` — first option is "— Unassigned —", then the four
  founders. Visible in both create and edit (Created By stays
  create-only). Modal bumped from `size="md"` (480 px) → `size="lg"`
  (640 px) so the wider founder labels ("Martin Drexler (Munich,
  DE)") don't force a horizontal scrollbar.
- `.formGroup` got `min-width: 0` and the descendant `.select` got
  `width: 100%` so long `<option>` labels can't widen the grid cell
  back to its intrinsic content width (the underlying cause of the
  scrollbar — CSS grid tracks default to `min-content`).

### Card display

- Meta row shows `By: Mike → Martin` for assigned tasks (accent-
  colored arrow + name) or `By: Mike → Unassigned` (italic muted).

### Filter bar — sidebar refactor

- Original: two horizontal filter rows + the "+ New Task" button in
  a single toolbar.
- New: two-column page layout with a **220 px sticky sidebar** on
  the left and a fluid main column on the right. Sidebar holds
  STATUS + ASSIGNEE sections; main column holds the "+ New Task"
  button + the task grid.
- Sidebar uses the existing `.filterTab` styling with
  `justify-content: space-between` so labels hug the left and
  count pills hug the right within each row.
- Same **viewport breakout** trick `/admin/marketplace` uses —
  `width: 100vw; margin-left: calc(50% - 50vw);` — so the sidebar
  escapes AdminShell's centred max-width and lands at the real left
  edge of the screen. AdminShell's `overflow-x: hidden` keeps this
  from inducing a horizontal scrollbar.
- Collapses below 900 px: sidebar becomes a horizontal flex-wrap
  row above the task grid.
- Dropped the "Unassigned" filter button per request; narrowed the
  state type from `Founder | "all" | "unassigned"` to
  `Founder | "all"`.

## 2. Marketplace — default view + restored lifecycle

- `MarketplacePage` initial view: `useState<ViewMode>("match")` →
  `useState<ViewMode>("pool")`. Founder clicking the Marketplace
  tab now lands directly on the roster.
- **Restored the 7 marketplace lifecycle steps** to
  `LIFECYCLE_STEPS` in `lib/members.ts` (Sign / Onboard / Run —
  these were trimmed earlier when the leads-page lifecycle was cut
  from 13 → 6). The leads page renderer explicitly calls
  `renderPhase("discern")` + `renderPhase("court")`, so adding the
  other 7 back doesn't surface them there. New
  `MARKETPLACE_LIFECYCLE_KEYS` constant exports the Sign/Onboard/Run
  slice. Single source of truth, each surface filters its own way.

## 3. Marketplace pool expanded row — full rebuild

The user wanted the pool's expanded row to **mimic the leads card
exactly** (Pipeline + Lifecycle structure), but with the
marketplace lifecycle steps. Iterated through several layouts based
on feedback.

### Layout (final state)

```
┌─────────────────────────────────────────────────────────┐
│ Urgent banner (when applicable)                          │  pool-level
├─────────────────────────────────────────────────────────┤
│ Pool toolbar (search + filters)                          │
├─────────────────────────────────────────────────────────┤
│ DataTable rows                                           │
│   ▼ Expanded row:                                        │
│ ┌─────────────────────┬───────────────────────────────┐ │  1. Contact
│ │ CONTACT             │ PIPELINE        Saving…/Saved │ │  + Pipeline
│ │ [avatar] Name        │ Phase  · Next step           │ │
│ │           Type · Role│ Added  · Signed              │ │
│ │ Organization         │                               │ │
│ │ Email / Phone /      │ Owner / Last contact (📅)    │ │
│ │ Website              │ Times contacted / Last resp. │ │
│ │                      │ Notes [textarea]              │ │
│ ├─────────────────────┼───────────────────────────────┤ │  2. Lifecycle
│ │ LIFECYCLE  3/7       │ COMMENTS         N posts     │ │  + Comments
│ │ [SIGN]               │ [Author Mike ▾]              │ │
│ │  ☑ Membership Sent   │                               │ │
│ │      Ops  May 18     │ ┌──────────────────────────┐ │ │
│ │  ☐ Membership Signed │ │ textarea fills height    │ │ │
│ │      Ops             │ └──────────────────────────┘ │ │
│ │ [ONBOARD]            │                       [Post] │ │
│ │  ☐ Welcome Box       │                               │ │
│ │  …                   │ Older comments…              │ │
│ └─────────────────────┴───────────────────────────────┘ │
│ ╔══════════ SIGNAL PROFILE — Click to view ▾ ═════════╗ │  3. Signal
└─────────────────────────────────────────────────────────┘
```

### `MarketplaceMemberDetails.tsx` (new file)

- Houses **ContactCard** + **PipelineCard** in a 360 / 1fr top grid.
- **ContactCard**: avatar (initials), name + type badge + role,
  `<dl>` of Organization / Email (mailto) / Phone (tel) / Website.
- **PipelineCard**: read-only Phase / Next step / Added / Signed
  `<dl>` at the top; editable inline-fields grid (**Owner**
  `<select>` from `MEMBER_OWNERS`, **Last contact** native date
  picker, **Times contacted** number, **Last response** text); then
  a notes textarea. All save-on-blur (or onChange for select/date)
  via the parent's `onMemberPatch`. Shared "Saving… / Saved /
  Failed" pill in the card header.
- Local **`useDraftSync<T>(upstream)`** hook (same render-phase
  compare-and-set idiom the leads PipelineCard uses) keeps each
  draft in sync with the server-echoed member after a successful
  PATCH.
- Local **`phaseVariant`** copy of the leads-page mapping (the
  leads file doesn't export it; per the "leave leads untouched"
  rule it's duplicated here — 7 lines).
- **`MarketplaceMemberComments`**: fetch from
  `/api/members/comments?member_id=…`, POST new entries. Form
  restructured to be vertical: author `<select>` (small, top),
  textarea **flex: 1 min-height: 140 px** (dominates the card),
  Post button bottom-right in `.mmCommentFormFooter`.

### `MembershipBlock` (in PoolView.tsx) — Lifecycle clone

- Rewrote the prior `MembershipBlock` into a faithful clone of the
  leads `LifecycleChecklist`:
  - "LIFECYCLE" title + **done/total progress pill** (turns green
    at 100%).
  - Sign / Onboard / Run **phase groups**, each with a phase
    `<Badge>` header.
  - Step rows are grid-laid `auto 1fr auto auto` (checkbox · label
    · role-tag · completion date).
  - Done steps strike-through; N/A steps (creator-only on brands)
    fade to 0.45 opacity.
- All `mm*`-prefixed CSS classes — duplicates of the leads
  `.lifecycle*` / `.step*` family, scoped to marketplace per the
  "leads code untouched" rule.

### Layout reshuffle

- **Lifecycle + Comments side-by-side** in `.mmLifecycleCommentsGrid`
  (50/50 stretch, collapses below 860 px) — same arrangement leads
  uses on its bottom row.
- **Signal Profile** moved to the bottom and turned into a big
  full-width button-style `<details>` summary (solid accent-soft
  background + accent border, bolder uppercase "SIGNAL PROFILE"
  label, "Click to view ▾" / "Hide ▴" hint flipping on `[open]`,
  hover inverts to solid accent fill).
- **Membership-signed date** moved from the lifecycle header into
  the Pipeline card's read-only fields.
- **Entity + RQ Profile DetailsGrid** removed entirely (no longer
  needed at the top — Pipeline carries the relevant info).

## 4. Pool overview table — "Next action" column

- Removed the three trait columns (Values / Authenticity / Horizon)
  along with `.traitBar` / `.traitFill` / `.traitValue` CSS and the
  `TRAIT_KEYS` / `TRAIT_LABELS` imports.
- Added a single **Next action** column showing the first not-yet-
  done marketplace lifecycle step (skipping creator-only steps for
  brand members): phase badge + step label, e.g.
  `[SIGN] Membership Sent`. Members with all steps done show a
  green `All steps complete` badge; mock entities (none after the
  next change) show `—`.

## 5. Mocks removed from the pool

- `MarketplacePage`'s `poolEntities` no longer concatenates
  `MOCK_ENTITIES` — it's just the converted real members. Dropped
  the `MOCK_ENTITIES` import.
- Sidebar subtitle: was `{MOCK_CREATORS.length} creators ·
  {MOCK_BRANDS.length} brands` — now derived from a new
  `poolKindCounts` useMemo over the live pool with proper
  pluralisation.
- `PoolView`'s `entities` default flipped from `MOCK_ENTITIES` to a
  stable empty `EMPTY_ENTITIES` constant (lifted out of render so
  the default doesn't recreate an array each render and re-fire
  downstream `useMemo`s).
- Name cell no longer renders the `MOCK` pill — pool is now real-
  members-only.
- **Kept intact** (for MatchBoard / PhaserMap / marketplace-match
  which still demo against mocks): `MOCK_ENTITIES` / `MOCK_CREATORS`
  / `MOCK_BRANDS` exports, the `is_mock` field on `MarketplaceEntity`,
  the `.mockPill` CSS rule. Sidebar "Brands matched / Creators
  matched" counters still divide against `MOCK_BRANDS.length` /
  `MOCK_CREATORS.length` because the `matches` store is keyed on
  mock ids. Cleaning Match/Map is a separate pass.

## 6. Urgent members banner (mirrors leads)

- `isMemberUrgent(m)`:
  - Real member (`became_member_at` set).
  - Active (not paused / churned).
  - Has at least one **incomplete marketplace lifecycle step**
    (skipping creator-only steps for brands).
  - **No `last_contact_at`** OR last contact ≥ `URGENT_DAYS` (7)
    days ago.
- Sort: never-contacted first (`Number.MAX_SAFE_INTEGER` sentinel),
  then by days-since-last-contact descending.
- Each row: name · phase badge of next pending step · `→ Next step
  label` · destructive-coloured "Xd since last contact" (or "Never
  contacted") · owner · **Resolved** button on the right.
- **Click row** (`openMember`): clears pool search + kind/match
  filters, sets `expandedRow` to `mem-${memberId}`, double-rAF +
  `scrollIntoView`. Same pattern the leads banner uses; relies on
  the existing `tr[data-row-id]` attribute that `DataTable` stamps.
- **Resolved** (`resolveMember`): bumps `last_contact_at` via
  `onMemberPatch`. Urgent `useMemo` recomputes (days-since drops to
  0) and the row drops off the banner.
- Styling under `.mmUrgent*` — same destructive-soft / destructive-
  border / accent-coloured-name visual the leads `.urgent*` family
  uses. CSS scoped to marketplace.

## Files touched

| Area | Paths |
|------|-------|
| Tasks rename | `apps/web/src/app/admin/{design-tasks → tasks}/*` (6 files), `apps/web/src/app/admin/layout.tsx` |
| Tasks assignee field | `apps/web/src/app/admin/tasks/page.tsx`, `page.module.css`, `apps/web/src/app/api/design-tasks/route.ts`, `docs/TASKS_ASSIGNED_TO.sql` (new) |
| Tasks sidebar layout | `apps/web/src/app/admin/tasks/page.module.css` |
| Lifecycle restoration | `apps/web/src/lib/members.ts` (LIFECYCLE_STEPS + MARKETPLACE_LIFECYCLE_KEYS) |
| Pool member details | `apps/web/src/app/admin/marketplace/MarketplaceMemberDetails.tsx` (new), `marketplace.module.css` |
| Pool lifecycle clone + layout | `apps/web/src/app/admin/marketplace/PoolView.tsx`, `marketplace.module.css` |
| Pool overview column + mock removal | `apps/web/src/app/admin/marketplace/PoolView.tsx`, `page.tsx`, `marketplace.module.css` |
| Urgent banner (pool) | `apps/web/src/app/admin/marketplace/PoolView.tsx`, `marketplace.module.css` |
| Session log | `docs/SESSION_LOG_2026-05-18_tasks-marketplace.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run lint:css` | ✅ pass |

## Open items / next-step notes

1. **Run the V3 + tasks-assigned-to migrations** before testing on
   the deployed build:
   - `docs/CRM_MEMBERS_SCHEMA_V3.sql` (from earlier today) — adds
     `contact_count`, `last_response`, `became_member_at` to the
     members table.
   - `docs/TASKS_ASSIGNED_TO.sql` — adds `assigned_to` to
     `design_tasks`.
2. **Match + Map views still use mocks.** `MOCK_ENTITIES` / the
   `is_mock` field / the `.mockPill` rule are deliberately left in
   place because MatchBoard + PhaserMap pair mock brands ↔ mock
   creators by RQ traits. Real members don't have RQ scores yet
   (graduated leads inherit `traits: { 50, 50, 50 }` placeholder).
   Cleaning those views = either fetching real RQ submissions per
   member or hiding the tabs entirely. Worth a session of its own.
3. **Sidebar `Brands matched / Creators matched` denominators**
   still reference `MOCK_BRANDS.length` / `MOCK_CREATORS.length`
   because the match store is keyed on mock ids. Cleans up with
   item 2.
4. **No real-member-bound match store yet.** A graduated lead can
   appear in the Pool but the Match view treats them as out-of-
   universe (their `mem-` id doesn't pair against any seed mock).
   Acceptable for now — Match/Map are prototypes until the RQ
   pipeline is wired through.
5. **Marketplace tab counters** ("How matching works" modal still
   uses MOCK_BRANDS.length / MOCK_CREATORS.length in copy) — minor;
   leave for the matchmaking pass.
