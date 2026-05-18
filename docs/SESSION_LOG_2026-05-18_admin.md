# Session Log — 2026-05-18 (admin/leads)

Second phase of the day. The morning was the /what-is-this hero work
(see `SESSION_LOG_2026-05-18.md`). The afternoon was a large pass on
the admin CRM: rename Members → Leads, overhaul the expanded card,
trim the lifecycle, add a "became a member" graduation flag, wire the
marketplace pool to real members, plus a stack of UX polish.

## 1. Members → Leads (nav + permalink)

- Directory `git mv`: `apps/web/src/app/admin/members/` →
  `apps/web/src/app/admin/leads/`. Also renamed the CSS module
  `members.module.css` → `leads.module.css` and updated the style
  import in the page.
- Navigation tab: `{ href: "/admin/members", label: "Members" }` →
  `{ href: "/admin/leads", label: "Leads" }`.
- `/admin` index redirect: `/admin/members` → `/admin/leads`.
- Homepage admin entry pill (`apps/web/src/app/page.tsx`) updated.
- Doc comments scrubbed in `AdminShell.tsx`, `admin/layout.tsx`,
  `admin/page.tsx`, `page.module.css`.
- **Intentionally kept as `members`:** the DB table, the
  `/api/members/*` routes, `@/lib/members` types (`Member`,
  `MemberPhase`, `MemberWritable`), and internal state vars. The
  rename was nav + permalink only; the data layer is unchanged so no
  Supabase migration is required for this part.
- User-facing copy on the page swapped through: "Members" → "Leads",
  "member / members" pluralisation, "Loading members…" → "Loading
  leads…", "New member" / "Edit member" / "Delete this member?" →
  "lead" variants. Subtitle rewritten to reflect outreach focus:
  "Outreach and onboarding progress for prospective creators and
  brand partners."

## 2. Expanded-card overhaul — ContactCard + PipelineCard

The old expanded panel was a single full-width `DetailsGrid` with
Contact / Pipeline sections stacked on top of a read-only Notes
panel. Replaced with two purpose-built cards in a 2-column top grid:

- **`<ContactCard>`** (left, ID-card style, max 360 px): avatar with
  initials + name header, member-type badge + role on the same line,
  then a `<dl>` of Organization / Email (mailto) / Phone (tel) /
  Website.
- **`<PipelineCard>`** (right, fills remaining width): "PIPELINE"
  eyebrow with shared status pill, compact two-column field grid
  (Phase badge, Next step, Added), then a row of inline-editable
  fields, then an inline-editable notes textarea.

Removed the old `DetailsGrid` / `DetailsSection` imports and the
standalone Notes panel block.

## 3. Inline-editable fields — generic save handler + sync hook

Introduced a generic `handleMemberPatch(memberId, partial:
MemberWritable)` callback in MembersPage. Same optimistic-update +
rollback pattern as `handleStepToggle`, but takes any Partial so a
single callback covers every inline edit on the card. Threaded
through MembersTable as `onMemberPatch`.

PipelineCard now drives **four inline-editable fields** plus a
**notes textarea**, all save-on-blur (or save-on-change for the
dropdown + date picker) via the shared callback. A tiny
`useDraftSync<T>(upstream)` hook DRYs up the React-19 render-phase
compare-and-set idiom used to keep each input synced with the
upstream `member` object after a PATCH echo (avoids the
`react-hooks/set-state-in-effect` lint rule).

Inline fields, in order:

| Field | Control | Save trigger | Notes |
|---|---|---|---|
| Owner | `<select>` from `MEMBER_OWNERS` | onChange | Empty option saves `null` |
| Last contact | `<input type="date">` | onChange | YYYY-MM-DD wire format; Postgres timestamptz parses as midnight UTC |
| Times contacted | `<input type="number">` | onBlur | Coerced + clamped non-negative integer; empty → `null` |
| Last response | `<input type="text">` | onBlur | Trim + null for empty |
| Notes | `<textarea>` | onBlur | Multi-line |

Status indicator ("Saving… / Saved / Failed to save") is **shared
across all five** and lives in the card header — not per-field —
because they all hit the same callback.

CSS: `.pipelineInlineFields` is a 2×2 grid (`repeat(2, minmax(0,
1fr))`) collapsing to a single column at ≤560 px.

## 4. Two new DB fields + a graduation flag

Added three columns to `members` (Supabase migration in
`docs/CRM_MEMBERS_SCHEMA_V3.sql`, safe-to-re-run via `IF NOT EXISTS`):

| Column | Type | Purpose |
|---|---|---|
| `contact_count` | integer | Total outreach touches (Times contacted) |
| `last_response` | text | Free-text capture of the most recent reply |
| `became_member_at` | timestamptz | Set when a lead graduates to full membership |

Added matching TypeScript fields on `Member` and extended the API
sanitize whitelist (`apps/web/src/app/api/members/route.ts`):

- The two string fields join the existing string-trim group.
- `contact_count` gets its own integer coerce-and-clamp (non-negative,
  floored).
- `became_member_at` gets the same ISO-or-null treatment as
  `last_contact_at`.

The migration also adds a **partial index** for the marketplace pool
query — `CREATE INDEX … ON members (became_member_at) WHERE
became_member_at IS NOT NULL`. Tiny but worth it because the pool
fetches on every marketplace page load.

## 5. Urgent leads banner — top-of-page priority list

A founder walking onto `/admin/leads` should immediately see what
needs attention. Added a banner above the table that surfaces
"stale" leads:

- **Rule (`isUrgent`)**: phase is active (not paused / churned / run)
  AND (`last_contact_at` is null OR ≥ `URGENT_DAYS` (7) days ago).
- Computed from the **unfiltered** member list (`useMemo`) — always
  visible regardless of the current search / filter state.
- Sorted by `urgencyScore` descending (never-contacted = sentinel
  `Number.MAX_SAFE_INTEGER`, then days-since-last-contact).
- Each row shows: name, phase badge, days-since-last-contact in the
  destructive red color, owner, and a `→` arrow.
- Clicking a row calls a new `openLead(id)` helper which clears all
  filters (search + phase + type + owner) and `setExpandedRow(id)` —
  guarantees the row is visible in the table below regardless of
  whatever the user was filtering by.
- **Auto-scroll**: after the state commits, a **double rAF**
  schedules `scrollIntoView({ behavior: "smooth", block: "start" })`
  on the matching `<tr>`. `scroll-margin-top: 88px` on
  `tr[data-row-id]` offsets for the sticky admin topbar so the row
  doesn't pin under it.
- To address rows from outside the table, **`DataTable` now stamps
  `data-row-id={id}` on every `<tr>`** — small general API addition.

Styling uses the existing `--admin-destructive-*` token family
(`-soft` for the banner background, `-border` for the border,
`--admin-destructive` for the alert circle). No new color tokens.

## 6. Lifecycle: 13 → 6 steps, single-column layout

The lead-stage checklist is now Discern + Court only. Removed seven
post-membership steps that belong to the marketplace lifecycle:

> dropped: `membership_sent`, `membership_signed`, `welcome_box`,
> `mercury_w9`, `show_info`, `art19_migration`, `campaign_planning`

`LIFECYCLE_STEPS` in `lib/members.ts` now has six entries:

1. Discernment (Discern phase)
2. First Contact (Court)
3. Meeting (Court)
4. Deck sent (Court)
5. Ad Copy Guidelines sent (Court)
6. RQ quiz (Court)

`sanitizeLifecycleSteps` already drops unknown step keys from the
stored jsonb, so historical rows with `welcome_box` etc. quietly
self-clean on next save — no data migration needed for the trim.

With only six steps left, the prior 2-column-plus-Run-row layout was
overkill. Collapsed to a **single-column stack** showing the Discern
phase group followed by the Court phase group. Dropped the
`.lifecycleColumns` / `.lifecycleColumn` / `.lifecycleRunRow` CSS.

## 7. "Has become a GhostSignal member" toggle + graduated-row chrome

New action button at the top of the expanded card (see §10 for the
layout move):

- Click → `void onMemberPatch(m.id, { became_member_at: new
  Date().toISOString() })`.
- Click again on a graduated lead → unmark by patching back to
  `null`.
- Label flips: "Has become a GhostSignal member" → "✓ Member since
  {date} — unmark". Variant flips primary → secondary.
- Tooltip explains either side of the toggle.

Graduated rows get visual de-emphasis:

- **New `rowClassName` prop on `DataTable`** — `(row, index) =>
  string | undefined`, applied alongside the default `.tbodyTr`.
  General addition; the leads page uses it as `(m) =>
  m.became_member_at ? styles.graduatedRow : ""`.
- `.graduatedRow td { color: muted; opacity: 0.65 }` (lifts to 0.85
  on hover). Eye still tracks to active leads first.

**Phase column override for graduated leads:** the entire phase cell
collapses to a single distinct pill. The Discern badge, the
`done/total` progress pill, and the red `.rotDot` all disappear once
`became_member_at` is set — they're not meaningful for someone who's
left the leads pipeline.

The replacement `.memberStatusBadge`:

- Uses `--admin-success-soft` background + `--admin-success` text
  (theme-safe in both modes, since white-on-bright-green fails
  contrast in dark mode).
- **1.5 px solid `--admin-success` border** — every other Badge in
  the table is borderless, so an outlined pill reads instantly as
  "different kind of status".
- Bolder weight + wider letter-spacing + leading `✓`.
- Pinned to `opacity: 1` inside `.graduatedRow` so the status stays
  bright while the rest of the row mutes.

## 8. Marketplace pool integration — automatic

When a lead is marked as a member, they automatically appear in the
marketplace pool on `/admin/marketplace?view=pool`.

- **Type relaxation**: `MarketplaceEntity.is_mock` changed from the
  `true` literal to `boolean`. Seed mocks keep `is_mock: true` and
  still render the MOCK pill; real upstreamed members get `is_mock:
  false` and render without the pill.
- **New `memberToMarketplaceEntity(m)` helper** in `lib/members.ts`
  (using a structurally-compatible `MarketplaceLite` type to avoid
  introducing a `members.ts → marketplace-mocks.ts` import). Returns
  `null` for non-graduated rows and for `member_type: "other"`.
  Maps:
  - `id` → `mem-${m.id}` (prefix avoids collisions with seed c-NN /
    b-NN ids).
  - `kind` → `member_type` (creator or brand).
  - `traits` → neutral 50/50/50 placeholder until they complete the
    RQ quiz (TODO: pull from `rq_submissions` when
    `rq_submission_id` is set).
  - `rq_code` / `rq_name` → "RQ-?" / "RQ pending" placeholder.
- **MarketplacePage** fetches `/api/members` once on mount via
  `useEffect`, maps each row through the converter, and composes
  `poolEntities = [...realMembers, ...MOCK_ENTITIES]` (graduated
  members surface first).
- **PoolView** now takes an `entities` prop (defaulting to
  `MOCK_ENTITIES` for backward compatibility). MOCK pill renders only
  when `e.is_mock === true`.

End-to-end: founder clicks "Has become a GhostSignal member" on a
lead → row grays out in `/admin/leads` → next time `/admin/marketplace`
opens, the person is in the pool. No manual sync, no separate data
entry.

## 9. Expanded-card layout — actions at top, side-by-side bottom

Restructured the expanded panel into four bands. The earlier vertical
stack made the panel disproportionately tall after the lifecycle was
trimmed to 6 steps — now the available width is used.

```
┌─────────────────────────────────────────────────────────┐
│ [Has become a GhostSignal member]    [Edit]  [Delete]   │  ← .leadActions
├─────────────────────────────────────────────────────────┤
│ [Contact ID card]    │ [Pipeline card]                  │  ← .topGrid
├─────────────────────────────────────────────────────────┤
│ [tags row, if any]                                      │
├─────────────────────────────────────────────────────────┤
│ [Lifecycle (6 steps)]│ [Comments thread]                │  ← .lifecycleCommentsGrid
└─────────────────────────────────────────────────────────┘
```

- **`.leadActions`** — flex row, `justify-content: space-between`.
  Primary "Has become a GhostSignal member" toggle hugs the left;
  Edit + Delete cluster on the right inside `.leadActionsGroup`
  (`gap: var(--admin-space-3)` — the "token distance" between
  buttons). Replaces the old bottom `DetailsActions` block; dropped
  the unused import.
- **`.lifecycleCommentsGrid`** — CSS grid `minmax(0, 1fr) minmax(0,
  1fr)` with the lifecycle on the left and the comments thread on
  the right, stacking to a single column below 860 px.
- **Equal-height grid columns**: both `.topGrid` and
  `.lifecycleCommentsGrid` use `align-items: stretch` so the shorter
  column extends its card chrome to match the taller one — Contact
  card matches Pipeline card height, Lifecycle matches Comments
  height. The two cards already use `display: flex; flex-direction:
  column` so they stretch cleanly with content anchored at the top.

## 10. Owner dropdown + Last contact date picker

Both fields moved from the read-only `pipelineFields` dl (Phase /
Next step / Added remain) into `pipelineInlineFields`, alongside
Times contacted + Last response. The dl is now purely read-only
metadata; the inline-fields section is the editable surface.

- **Owner**: `<select>` populated from `MEMBER_OWNERS` (the existing
  four-founder list in `lib/members.ts`). Saves on change. Empty
  option saves `null`.
- **Last contact**: `<input type="date">`. Native browser date
  picker; saves on change. Date round-trips via `YYYY-MM-DD` (slice
  the leading 10 chars of the stored ISO timestamp). Postgres
  timestamptz parses the date string as midnight UTC.
- Both reuse `.pipelineInlineInput` so they match the other inline
  fields visually.

## Files touched

| Area | Paths |
|------|-------|
| Members → Leads rename | `apps/web/src/app/admin/{members → leads}/` (renamed both files via `git mv`), `apps/web/src/app/admin/layout.tsx`, `admin/page.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/page.module.css`, `apps/web/src/components/admin/AdminShell.tsx` |
| Lifecycle trim | `apps/web/src/lib/members.ts` (LIFECYCLE_STEPS) |
| New columns + API | `apps/web/src/lib/members.ts`, `apps/web/src/app/api/members/route.ts`, `docs/CRM_MEMBERS_SCHEMA_V3.sql` (new) |
| Expanded-card overhaul | `apps/web/src/app/admin/leads/page.tsx`, `apps/web/src/app/admin/leads/leads.module.css` |
| DataTable additions | `apps/web/src/components/admin/DataTable.tsx` (rowClassName prop, data-row-id attribute) |
| Marketplace integration | `apps/web/src/app/admin/marketplace/page.tsx`, `apps/web/src/app/admin/marketplace/PoolView.tsx`, `apps/web/src/lib/marketplace-mocks.ts` (is_mock relaxed), `apps/web/src/lib/members.ts` (memberToMarketplaceEntity) |
| Session log | `docs/SESSION_LOG_2026-05-18_admin.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run lint:css` | ✅ pass |
| `npm run assets:audit` | ✅ 51 referenced public assets resolve |

## Open items / next-step notes

1. **Run the V3 migration.** `docs/CRM_MEMBERS_SCHEMA_V3.sql` must be
   executed once in the Supabase SQL editor before the new inline
   fields and the graduation toggle will save. Without it, PATCHes
   to `contact_count` / `last_response` / `became_member_at` fail
   with a Postgres "column does not exist" — the API returns 502.
2. **Real RQ traits for graduated members.** The
   `memberToMarketplaceEntity` helper currently hardcodes traits as
   neutral 50/50/50. When a graduated member has a non-null
   `rq_submission_id`, those traits should be pulled from
   `rq_submissions` and converted. Follow-up pass; the placeholder
   is fine until matchmaking starts running on real members.
3. **Removing graduated leads from the leads list entirely.** The
   user explicitly wanted graduated leads to *stay* in the list,
   just grayed out. If that changes, add a filter on `filtered` to
   exclude them and a "Show graduated" toggle.
4. **Tunable `URGENT_DAYS`.** Currently 7. If founders find it too
   noisy or too quiet, tune at the top of `leads/page.tsx`.
5. **Last-contact timezone edge.** `<input type="date">` reads/writes
   `YYYY-MM-DD` which Postgres stores as midnight UTC. The existing
   `formatDate` helper uses `toLocaleDateString` which can drop the
   day for users west of UTC. Pre-existing quirk; not addressed
   here, but worth a fix when a date-only field is added (use a
   non-locale-shifting formatter or store as `date` instead of
   `timestamptz`).
