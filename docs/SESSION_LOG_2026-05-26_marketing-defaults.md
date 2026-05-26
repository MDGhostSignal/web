# Session Log — 2026-05-26 (marketing: Social Planner as default, Month always as entry view, label rename)

## Summary

Three small UX changes on the Marketing surface:

1. **Marketing tab → Social Planner** — clicking "Marketing" in the admin left sidebar (which links to `/admin/marketing`) now lands on the Social Planner instead of Assets. Saves a click for the highest-volume Marketing sub-page.
2. **Month always the entry view** — Social Planner always opens on the Month view. The switcher still lets the user pick Day / Week / Year within the session, but the choice is no longer persisted — every fresh open lands back on Month.
3. **Sidebar label rename** — child nav item under Marketing: `Social` → `Social Planner`. Visual reads "Marketing › Social Planner".

## Changes implemented

### Edited
- `apps/web/src/app/admin/marketing/page.tsx` — `redirect("/admin/marketing/assets")` → `redirect("/admin/marketing/social")`. Comment updated to explain the choice.
- `apps/web/src/app/admin/layout.tsx` — Marketing children: `{ href: "/admin/marketing/social", label: "Social" }` → `{ ..., label: "Social Planner" }`.
- `apps/web/src/app/admin/marketing/sections/SocialSection.tsx`:
  - `useState<CalendarView>("week")` → `useState<CalendarView>("month")`.
  - Removed the localStorage hydration `useEffect` + `hydratedRef`. Removed the localStorage write in `handleViewChange`. Removed the now-unused `VIEW_STORAGE_KEY` + `VALID_VIEWS` constants. Removed the `useRef` import.
  - Updated the section's header comment to explain the new "always-Month entry view" behaviour and the rationale ("deterministic entry beats remembered one for shared admin UX — founders look at the same screen").

## Files touched

- `apps/web/src/app/admin/marketing/page.tsx`
- `apps/web/src/app/admin/layout.tsx`
- `apps/web/src/app/admin/marketing/sections/SocialSection.tsx`

## Validation results

Three gates green (no asset changes, so `assets:audit` skipped):

- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean

Browser-verified by user.

## Reversing earlier decision

Phase 1 of the calendar feature (commit `755f466`) added localStorage view persistence at the user's confirmation. That decision is now reversed by user direction — they want deterministic entry behaviour. The `ghostsignal.admin.social.view` key may still exist in any browser that previously used the planner; harmless (no code reads it anymore) but worth knowing for any future debug. Founders can clear localStorage on the admin origin to remove the stale key.

## Open notes

- **Within-session view changes still work** — clicking Day / Week / Year in the switcher still flips the visible grid; the change just doesn't survive a page reload or a fresh tab.
- **Per-user preference could come back** as a server-side stored field on a future "admin user preferences" surface, but right now there's no such concept (admin auth is a single shared password). Deterministic entry view is the right call until per-user identity exists.
