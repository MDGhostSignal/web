# Session Log — 2026-09-03

## ART19 explainer — shorter logo, new open line, brighter bed

- Logo sting is 3s (fade in/out), then VO starts: “Welcome to Ghost Signal…”
- Dropped “we can't wait to see what we can build together”
- Bed bumped to 126 BPM, brighter I–V–IV–I plus a light melody
- Copied into `apps/web/public/videos/art19-explainer.{mp4,srt,vtt}`

## Explainer — invitation founder cards + bluegrass

- End card uses the live `/invitation` founder-tile layout (photo +
  name / role / location / bio), not circles.
- Bed is "Hillbilly Swing" by Kevin MacLeod (incompetech.com), CC BY.
  Credit on the last frame.
- Shipped again to `apps/web/public/videos/art19-explainer.mp4`

## Explainer bed: Easy Lemon

Mixed Kevin MacLeod "Easy Lemon" (82 BPM) under the VO at 0.28.
Credit on the last frame. Copied to public videos.

## /studio/migration layout (shipping)

Three chapters: video, 4-up checklist, How to publish. 50/50 video
row with large jump buttons and a YouTube-style play overlay.
Not committing `production/` (local render vault).

## Migration page mobile

Compact 3-across chapter rail, row-style jump buttons, larger
check tap targets, horizontally scrollable ART19 screenshots,
tighter Studio header on small screens.

## Creator invitation page

`/invitation/creators` is the twin of `/invitation`. Mike's How we
do it copy ships with the same three titles as the brand page,
creator-facing bodies, plus the honor-your-audience quote. URL for
creator outreach: `/invitation/creators`.

## ART19 Tutorial (Jack)

`/studio/migration` is now two chapters, video guide removed.
Tabs: **My Character**, **ART19 Tutorial**.
Checklist is two cards — Pre-Move Cataloging and Making the Switch.
Tutorial is Select Episode (New Ep / Existing Ep) then Insert Marker
(2 × 120s mid-rolls). Storage key bumped to `studio-art19-migration-v2`.
Validation: typecheck, lint (pre-existing warnings only), lint:css,
assets:audit all passed. Playwright: tabs, two-step copy, no `<video>`.

## ART19 tutorial screenshots (Jack)

Replaced the three old captures with four new ones from
`production/art19-explainer/new/`, shipped as webp under
`apps/web/public/images/studio/art19-tutorial/`:
- `step-1-new-ep.webp` — Content dashboard, New Episode top-right
- `step-1-existing-ep.webp` — open episode, Edit top-right
- `step-2-green-tab.webp` — waveform with the green marker tab
- `step-2-midroll.webp` — Mid-Roll, 120 seconds, 2 positions
Removed unused `step-1-login`, `step-2-publish`, `step-3-ad-markers`.

## Migration RSS field

Dropped the inline RSS submit box from the Pre-Move checklist.
The item now points people to input the feed URL in their profile
(`/studio/profile`).

## Commit / push (end of day)

Shipped the ART19 Tutorial rewrite, new screenshots, creators
invitation copy, session log, and `docs/ART19_S3_BUCKET_SETUP.md`.
Left `production/` untracked (local render vault).

## Creators invitation headline

`/invitation/creators` hero is now two lines: "Advertising that
builds trust" / "with your audience" (was "You're invited to
GHOSTSignal!").
