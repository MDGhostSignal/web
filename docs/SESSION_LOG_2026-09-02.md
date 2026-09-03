# Session Log — 2026-09-02

## ART19 explainer v2

Recut of the creator walkthrough: less VO, faster/more natural
voice (Ava multilingual +8%), real ART19 click screenshots as the
main picture, founders on the contact card.

### Files

- `production/art19-explainer/art19-explainer-v2.mp4` (~47s, 1920×1080)
- `production/art19-explainer/art19-explainer-v2.srt`
- `production/art19-explainer/build.py`

### Notes

- v1 (~3:56, Jenny −12%) kept for comparison
- Screenshots: `apps/web/public/images/studio/art19-tutorial/step-{1-login,2-publish,3-ad-markers}.webp`
- Founders: who-are-we mike6 / jack11 / martin3 / jeremy4

## ART19 explainer v3

Bubbly SaaS walkthrough. Frames are a 1:1 clone of `/studio/migration`
(light Studio chrome, 4-step purple board, tutorial with real ART19
screenshots). Conversational VO, not a numbered recitation.

- `production/art19-explainer/art19-explainer-v3.mp4` (~2:23, 1920×1080)

## ART19 explainer v4

Logo sting, spoken+on-screen URL (`ghostsignal.cloud/studio/migration`),
1.8s pause, then "Now let's get you set up." Quiet synthesized
elevator bed under the VO.

- `production/art19-explainer/art19-explainer-v4.mp4` (~2:35)

## ART19 explainer v5

Spinning cloud-S intro, branded title card with a slow push (first ~18s
is mood only). Real `/studio/migration` board from 18s. Bed mixed
audibly under VO (`normalize=0`, volume 1.0).

- `production/art19-explainer/art19-explainer-v5.mp4` (~2:36)

## ART19 explainer v5 polish

Native @4x cloud brandmark fade in/out (no spin, no upscale). Title
letters fade in sequentially, card stays locked. Hum replaced with a
rhythmic major-key bed mixed under VO.

## ART19 explainer — slower intro + invitation clouds

Logo fade stretched to 10s. Title sequence starts at 0:10 over the
`/invitation` B&W cloud hero (`invitation-hero.mp4`) with a white
scrim and dark type. Studio page still follows the welcome.

## /studio/migration — three-chapter layout

Video first, then the 4-up move checklist (same board as the video,
no longer viewport-filling), then publishing. Sticky chapter rail +
"still on this page" jump card so "Once you've moved in" is advertised
before you scroll.

- `apps/web/src/app/studio/migration/{MigrationGuide.tsx,migration.module.css,page.tsx}`
- `apps/web/public/videos/art19-explainer.{mp4,vtt,poster.jpg}`
- typecheck / lint (0 errors) / lint:css / assets:audit OK (67)
