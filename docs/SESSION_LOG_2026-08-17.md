# Session Log — 2026-08-17

Big day on the cold-outreach / invitation surface and a full rebuild of
the `/xqrq` XQ·RQ landing page.

## Invitation page + cold-outreach roster

- **Real client roster** on `/invitation` (`RosterCarousel.tsx`): replaced
  the 8 mock clients with the 13 Mike curated (5 brands, 8 creators).
  Added per-card **logo + background** slots with graceful monogram/tone
  fallback, plus optional `bannerGradient` / `bannerPosition` / `logoDark`.
  - Assets in `public/images/invitation/roster/` (README maps slug →
    files). Found **The Pivot** (Apple Podcasts cover + Osenga stage
    photo from andrewosenga.com) and **The Habit** (Apple Podcasts cover)
    online. Holly Mackle: pulled her Supabase avatar, then swapped to a
    supplied photo (top-anchored so her face isn't cropped). Etkin logo
    is white → `logoDark`. Gradients for MatchGrant / The Pivot / Habit.
  - Mock XQ/RQ + blurbs per card (clearly marked placeholder).
- **Headline** → "You're invited to the GHOSTSignal ecosystem" (was
  "…Studio"); removed every user-facing "Studio" mention on the page and
  in the email. Trimmed the hero lede's first sentence.
- **Section swap**: "Who we work with" (roster) now sits above "What this
  is"; the purple band stays with the top slot.
- **Card polish**: taller card banners (96→128) with content shifted
  down in step; the profile popup enlarged (~3× width / ~2× height, two-
  column XQ/RQ, readable text width).

## CRM (Supabase)

- Created member rows for **The Habit** and **The Hutchmoot Podcast**
  (creator, phase `discern`, owner Mike Sense) so all 13 roster names
  exist in the CRM.
- ⚠️ Open: **Sunshine In My Nest** has 3 duplicate member rows
  (discern/court/sign) — needs a keep/merge decision.

## Cold email (`lib/cold-outreach-email.ts`)

- **Reply-To → Mike** (`reply_to`, overridable via `OUTREACH_REPLY_TO`)
  in `api/admin/outreach/route.ts` so replies leave the noreply From.
- Headline + Studio removal synced; **section order** reordered to mirror
  the invitation page (roster → quote → what-is-this) in both HTML and
  plain-text parts.
- ⚠️ Open: the email's "Who we work with" is still the **mock roster
  GIF**; regenerate with the real clients before real sends.

## RQ lockdown (members-only strategy)

- All public "take the RQ" links repointed from `/rq-quiz` to `/xqrq`
  (invitation, signal-sheet, xq-quiz results). `/rq-quiz` removed from
  `sitemap.ts`. XQ stays free/public; the quiz page still exists for
  members but is unlinked.
- Note: `/rq-quiz` is still reachable by direct URL — a members gate/
  redirect is a possible follow-up.

## `/xqrq` landing page — full rebuild

- Copy aligned to Jeremy's text; **RQ CTA is a non-clickable "Only
  accessible to members"** pill.
- **One continuous cosmic backdrop** (fixed nebula drift + starfield)
  behind the whole page; removed the per-hero bg and `ParallaxBackground`.
- Narrative split into two bands; the second gets its own orange eyebrow
  ("The question").
- **RQ resonance explorer** (`RQExplorer.tsx`, `rq-explorer-data.ts`):
  static isometric 3D graph of all 216 combinations (three axes → colour
  channels), floor plane + dashed bounding-box wireframe, flat dots,
  on-axis pole labels, a slow ripple wave on hover (rAF + `--pulse`), and
  a floating tooltip (portalled) with code + three-word name + a
  3-sentence summary. Responsively scales to its column.
- **XQ character map** (`XQMapCard.tsx`): shared `XQSpectrumMap` gained
  additive `hideTooltip` + `onHover` props; on `/xqrq` its in-SVG tooltip
  is replaced by a floating tooltip that **reuses the RQ tooltip's exact
  CSS** (identical tile), showing the enlarged character mark + code +
  name + tagline. Character names bumped (scoped to this page).
- **Two maps side by side** in equal-size glassy tiles on the space bg;
  each map topped by its 3D wordmark logo + a distinct headline; each
  CTA box folded under its map, bottom-aligned. Removed the separate
  assessments headline/section, the "start with the XQ" footnote, and the
  final XQ·RQ lockup box.

## Files touched

- `apps/web/src/app/invitation/{RosterCarousel.tsx,page.tsx,page.module.css}`
- `apps/web/public/images/invitation/roster/*` (new assets + README)
- `apps/web/src/app/api/admin/outreach/route.ts`
- `apps/web/src/lib/cold-outreach-email.ts`
- `apps/web/src/app/{signal-sheet/page.tsx,xq-quiz/ResultsScreen.tsx,sitemap.ts}`
- `apps/web/src/components/xq/XQSpectrumMap.tsx`
- `apps/web/src/app/xqrq/{page.tsx,page.module.css,RQExplorer.tsx,rq-explorer-data.ts,rq-explorer.module.css,XQMapCard.tsx,xq-map-card.module.css}`

## Validation

- Per-file `eslint` / `stylelint` / `tsc` clean throughout; full repo
  gate run before commit (see below).

## Open items / next steps

- Regenerate the cold-email roster GIF with the real clients.
- Decide on the Sunshine In My Nest duplicate CRM rows.
- `/for-advertisers` "Business Case" reorder (Mike's observation).
- Altar Migration explainer video — write the croc-imagine instructions.
- Optional: gate `/rq-quiz` direct-URL access for non-members.

## Follow-up — `/xqrq` narrative section (later same day)

- Made the world-making / "the question" narrative **more visual**: the
  list of world-makers became gold pill **chips** (Businesses, Podcasters,
  Artists, Musicians, Creators; lead reworded to "Everyone is making the
  world…"), and the two questions were pulled out as **numbered glassy
  cards** (01/02).
- **Reordered**: both narrative bands now sit **below the two maps**
  (Hero → maps → world-makers → the question → Contact), so the page
  opens straight into the interactive XQ/RQ maps.
- Files: `apps/web/src/app/xqrq/{page.tsx,page.module.css}`. eslint /
  stylelint clean, page 200.

## Follow-up 2 — XQ CTA + `/xqrq` copy tweaks

- **"Take the XQ" skips the intro**: the `/xqrq` CTA now links to
  `/xq-quiz?start=1`; `xq-quiz/page.tsx` reads `?start` (via
  `useSearchParams` inside a `Suspense` boundary) and lands the user on
  the first fill-out step (contact) instead of the welcome intro. Direct
  `/xq-quiz` visits keep the intro.
- Added **Non-profits** chip after Businesses in the world-maker chips.
- "Reserved for members of GHOSTSignal." now on its own line (`<br/>`).
- Maps headline → "Two assessments for values-alignment."
- Files: `apps/web/src/app/{xq-quiz/page.tsx,xqrq/page.tsx}`.

- Moved the "The question" band to just **above** the maps (Hero → the
  question → maps → world-makers → Contact); maps headline → "Two
  assessments for values-alignment."

## Follow-up 3 — invitation page copy + XQ map

- Hero: headline → "You're invited / to GHOSTSignal!"; new values-based
  subheadline; roster eyebrow → "Here are some of our current
  world-makers:"; removed the "What this is" description sentences.
- Bottom CTA section: replaced the XQ/RQ two-up + example map with the
  interactive XQ character map (reused `XQMapCard` from /xqrq) under
  "Discover your character by taking our values quiz." + a "Take the XQ"
  CTA (/xq-quiz?start=1).
- Files: `apps/web/src/app/invitation/{page.tsx,page.module.css}`.

- Added a hover animation to the invitation "What this is" feature
  tiles: subtle lift + soft drop shadow + violet accent border on a
  220ms ease transition (disabled under prefers-reduced-motion).
