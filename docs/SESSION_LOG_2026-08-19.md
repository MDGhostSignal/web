# Session Log — 2026-08-19

Polish on the `/invitation` roster popup (the baseball-card carousel):
a themed close button and the XQ/RQ reads floated to the card's bottom.

## Roster profile popup — close button + quotient placement

Both changes in `apps/web/src/app/invitation/` (`RosterCarousel.tsx` +
`page.module.css`).

- **New close button.** The old control was a raw `&times;` glyph in a
  plain white circle — looked improvised over the banner image. Replaced
  the glyph with a **stroked SVG X** and restyled `.profileClose` as a
  **frosted-glass disc** (semi-transparent dark bg + `backdrop-filter:
  blur`, echoing the overlay's own blur so it reads as part of the popup).
  On hover it adopts the card's **tone accent** (blue for brands, orange
  for creators, via `--pk-accent`) with a subtle 90° rotate; proper
  `:focus-visible` ring; `prefers-reduced-motion` drops the rotate.
- **Round, not square — token bug.** Martin flagged the button was still
  square. Root cause: `--gs-radius-full` is `9999` **unitless**, so
  `border-radius: var(--gs-radius-full)` is invalid CSS and the browser
  drops it → square corners. Fixed to the token pattern
  `calc(var(--gs-radius-full) * var(--gs-px))` → real `9999px` → true
  circle. ⚠️ **Same bare-token bug affects other elements in this file**
  (carousel arrows, legend dot, kind chips) — left as-is this session, a
  one-pass sweep is offered.
- **XQ/RQ tiles float to the bottom.** `.profileQuotients` changed from a
  fixed `margin-top` to `margin-top: auto`; the profile card is a flex
  column with spare `min-height`, so the two summary tiles now sit against
  the card's lower edge instead of stacking tight under the copy.

## Files touched

- `apps/web/src/app/invitation/RosterCarousel.tsx` — SVG X icon in the
  close button.
- `apps/web/src/app/invitation/page.module.css` — `.profileClose` restyle
  + circle fix; `.profileQuotients` bottom-float.
- `AGENTS.md` — `next dev`'s auto-regenerated nextjs-agent-rules block
  (committed per the file's own instruction to keep the tree clean).

## Validation

- `npx stylelint src/app/invitation/page.module.css` — clean.
- `tsc --noEmit` — clean.
- `next dev` running on :3000 for live inspection; Martin reviewed.

## Open / next

- Optional: sweep the remaining bare `border-radius: var(--gs-radius-full)`
  usages in `page.module.css` onto the `* var(--gs-px)` pattern.
- **Next up: social media** — (1) review the social strategy, (2) create a
  batch of posts to publish today.

## Social posts batch + local checklist

- Reviewed the four-pillar social strategy (`social_media_strategy/`) against
  the whitepaper + packs. Flagged three fixes: platform mismatch (strategy
  targets X/LinkedIn; scheduler tool only does FB/IG/Substack), the invented
  "40% engagement boost" stat (dropped — use the real 13-client roster + XQ
  quiz instead), and the off-brand hype voice.
- Wrote a 7-post rotation (IG/FB/LinkedIn/X each) → `docs/SOCIAL_POSTS_2026-08-19.md`.
- Built a **local posting checklist** served off the dev server:
  `apps/web/public/social-checklist.html` + `.js` (28 tickable rows, per-row
  copy buttons, localStorage tick-state, "signal strength" meter). Static
  files under `public/` → live at `/social-checklist.html`, no route/auth.
  (Also exists as a private Artifact, but Martin wanted it local.)

## Scheduled Cold Outreach (Mike's feature)

Big new feature: schedule cold emails to *arrive* at the perfect US-inbox
moment while Mike composes from Prague. **Delivery uses Resend's native
`scheduled_at`** (ISO 8601, up to 30 days out, minute-accurate) — chosen over
a polling cron because Actions cron lags 5–15 min and would miss the window.
Resend also gives `PATCH /emails/{id}` (reschedule) + `POST .../cancel`.

Built end to end:
- **Schema** `docs/OUTREACH_SCHEDULING_SCHEMA.sql` — extends `cold_outreach`
  with `scheduled_at`, `recipient_tz`, `resend_id`; status vocab now
  `sent | scheduled | canceled | failed`. **NOT YET APPLIED to prod** (MCP is
  read-only; live table still has the original 8 cols — Martin must run it).
- **Timezone util** `lib/timezone.ts` — DST-correct recipient-local→UTC
  (`zonedWallTimeToUtc`, two-pass), US zone list, best-window presets +
  `nextPresetInstant`, and `avoidCollision` (batch stagger). Verified against
  EDT/EST/PST/PDT + a fall-back-day case with a standalone test — all pass.
- **Shared send** `lib/cold-outreach-send.ts` — one Resend call for immediate
  + scheduled; plus reschedule / cancel / delivery-status helpers.
- **API** — `outreach/route.ts` POST accepts `scheduledAt`+`recipientTz`
  (validates ≥1 min, ≤30 days; dup-guard now only blocks live sent/scheduled),
  stores `resend_id`. New `outreach/[id]/route.ts` (PATCH reschedule / DELETE
  cancel). New `outreach/reconcile/route.ts` cron (Bearer CRON_SECRET or
  cookie) trues past-due scheduled rows up against Resend's `last_event`.
  Added `/api/admin/outreach/reconcile` to proxy.ts PUBLIC_SUBPATHS.
- **UI** — composer gained a Send-now/Schedule toggle + `ScheduleFields`
  (zone picker, presets, precise date/time, live dual-time readout "arrives
  10 AM their time = 4 PM yours", auto-stagger toggle). List gained
  Scheduled/Sent/All filters, a schedule-aware "When" column with live
  countdown, and Reschedule/Cancel row actions (+ `RescheduleModal`) and a
  "Refresh statuses" button.
- **Cron** `.github/workflows/outreach-reconcile.yml` — every 15 min, mirrors
  the crm-alerts-digest pattern. Needs repo secret `OUTREACH_RECONCILE_URL`
  (+ existing `CRON_SECRET`).

Validation: `tsc` clean, `eslint` clean, admin CSS Stylelint-excluded, all
new routes compile + enforce auth (307/401 as expected).

### Verification done (2026-08-19 afternoon)
1. ✅ **Schema applied** by Martin — Supabase reported success; the three
   columns are live.
2. ✅ **Resend plan confirmed to support scheduled sends** — direct API test:
   POST with `scheduled_at` → 200 + id + scheduled_at. Cancel works.
3. ✅ **Full app-level E2E passed** — login → POST scheduled reachout → row
   filed `scheduled` w/ `resend_id` → DELETE cancel → `canceled`; test row
   cleaned up. Nothing delivered.
4. 🐛→✅ **Found + fixed a race:** a freshly-scheduled email sits in Resend
   `queued` for ~1-2s before `scheduled`, and PATCH/cancel **422** during that
   window. `rescheduleColdOutreach` + `cancelColdOutreach` now retry 422 (3×,
   1.5s) — the app-level cancel then succeeded first try.

5. ✅ **`OUTREACH_RECONCILE_URL` secret set** by Martin.
6. ✅ **Reconcile endpoint verified locally** with the exact call GitHub sends:
   no-auth → 401, wrong `CRON_SECRET` → 401, correct Bearer → 200
   `{ok,checked,updated,via:"cron"}`.
7. ✅ **Reschedule verified** end-to-end (PATCH moved time + tz, then cancel).
8. 🐛→✅ **Queued-race retry budget was too short** — a first reschedule test
   422'd because Resend held the email `queued` >5s. Bumped the retry to 6×2s
   (~12s, under a new `maxDuration=30` on the `[id]` route), and a still-
   queuing terminal case now returns a friendly 409 "try again shortly"
   instead of a 502. Re-test: PATCH succeeded in 2.8s through the race.

### Composer width (Martin: "New reachout" modal too narrow)
Compose state now opens at `min(1040px, 94vw)` (doubled-class `.composerWide`
beats the Modal primitive's size cap) with a **two-column form grid**:
Name/Email and Template/Timing pair per row; message, schedule fields, and
actions span full width. `ScheduleFields`' internal `.schedule` is now a
2-col grid too (zone+presets top row; date/time, stagger, readout span).
Preview + sent states keep their prior sizes. Collapses to 1-col under narrow
viewports. tsc/eslint clean.

Follow-up (Martin): the **Send now / Schedule for later** toggle moved to the
**top of the form, full width** — `.timingToggle` is now `display:flex;
width:100%` with each option `flex:1` (bigger: 15px semibold, 12px padding,
active side gets accent fill + shadow), so the two buttons fill the container
instead of a narrow inline pill. Email-template field spans full width so
nothing is orphaned in the 2-col grid.

### Fix — unreadable time-zone dropdown (Martin)
The `ScheduleFields` recipient time-zone `<select>` showed white-on-white
options. Root cause: the admin theme set **no `color-scheme`**, so Windows
rendered the native `<select>` popup in light scheme (white ground) while the
option text stayed light — and a first attempt failed because
`--admin-surface-1` is a *translucent white*, useless as an opaque option bg.
Fix: `color-scheme: dark` on the admin root + `color-scheme: light` on the
`[data-theme="light"]` block in `components/admin/tokens.css` (themes all
native controls — also fixes the scheduler's native date/time pickers), and
the option bg switched to the opaque `--admin-bg-elevated`. `tokens.css` loads
only on admin routes, so the public site is untouched.

### Advice given (no code): cloud video in the email hero
Recommended **against** a `<video>` background (Gmail + all Outlook strip it;
only Apple Mail renders it) and against a heavy cloud GIF (2–5 MB vs the
existing ~48 KB poster; Outlook shows first frame only; images blocked by
default; slower cold-send load). Recommended: keep a **static still** (the
cloud video's poster frame we already have) optionally with a play-button
that links to `/invitation` where the real video plays. Left untouched.

### Only remaining step to activate the LIVE cron: deploy
The reconcile route + `outreach-reconcile.yml` exist only in the local tree —
push + Vercel deploy is required before the GitHub Actions cron (and the prod
endpoint it calls) actually run. Everything testable pre-deploy is green.
