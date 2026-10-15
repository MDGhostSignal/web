# Session log 2026-10-15

## Changes
- Jack's brand/creator/What Is This notes applied on the noindex previews only. Live `/`, `/for-advertisers`, `/for-creators`, and `/what-is-this` stay on their current copy and heroes.
- Advertisers preview hero is the football-player still. Subhead is the positive frame (void, friend's house, "I saw this, and I thought of you").
- Creators preview hero is a new analog night-city still. Subhead is the positive frame (trust, net-good brands, make money).
- Preview benefit lists use sharpened invitation-page cards. The feature graphs stay hidden. Journey steps are membership, character/resonance, campaigns.
- What Is This preview keeps the girl-in-the-clouds loop and adds two plates beside the orbit sections.

## Files
- `apps/web/src/app/preview/advertisers-hero/page.tsx`
- `apps/web/src/app/preview/creators-hero/page.tsx`
- `apps/web/src/app/preview/creators-hero/preview.module.css`
- `apps/web/src/app/preview/what-is-this/page.tsx`
- `apps/web/src/app/for-advertisers/page.tsx`
- `apps/web/src/app/for-advertisers/page.module.css`
- `apps/web/src/app/for-creators/page.tsx`
- `apps/web/src/app/for-creators/page.module.css`
- `apps/web/src/app/what-is-this/page.tsx`
- `apps/web/src/app/what-is-this/page.module.css`
- `apps/web/public/images/preview/creators-analog-city.jpg`
- `apps/web/public/images/preview/wit-world.jpg`
- `apps/web/public/images/preview/wit-values.jpg`

## Validation
- `npm run typecheck` passed.
- `npm run lint:css` passed.
- `npm run assets:audit` passed.
- ESLint on the six changed pages: 0 errors. Existing `<img>` warnings on the two hero previews.
- Dev server already on http://localhost:3000. No full browser pass of scroll and drag.

## Later the same day
- Preview benefit blocks are now a three-column invitation-style grid, with the invitation pull-quote in place of the graph.
- Harmony plate sits to the lower right of the sun. Values plate sits in the text column beside the binary orbit.
- Victorian lady still (no blink) is in the closing band of the What Is This preview only.
- Creators city still was edited to drop the left slab and the sidewalk scribble.

## Later the same day, continued
- Advertisers preview: Maria statue keeps the live scale and parallax, and the frame no longer crops her. Cloud loops are twice as slow.
- The advertisers business-case graph is a native three-step build (signal-code rail, cards, hero-style summary reveal). Creators preview uses the same build with creator copy.
- Creators preview hero is the user-supplied suburban dawn still, fitted to the hero, with the subhead broken into three lines and the white gap under the hero closed.
- Live `/for-advertisers` and `/for-creators` copy and heroes are unchanged. Preview copy is gated by `previewCopy`.

## What Is This preview, after the hero push
- Midsection background is the creators membership cloud. The hero video fades into that sky.
- Round generated plates, their captions, the earbuds still, and the harmony sun are off this preview.
- Values blob uses a brand-color gradient on the standard material. The custom shader that threw the `alpha` error is gone.
- The globe under "This is the signal" has about 200px more room, and the elevation map is colored like a satellite photo: deep blue water, olive and tan land, pale peaks.
- That globe component is shared, so the live What Is This page picks up the same Earth colors.

## Deploy
- `c27a25b` and `a3c265b` are on `origin/main`. Both Vercel production builds failed in `tsc` on `PreviewFeatureBuild.tsx` (`"--step-color"` is not a known CSS property). Last green production deploy was `14f6804`.
- Cast that style to `React.CSSProperties`, same as the other custom properties in the app.
- Creators preview hero no longer clips the three-line subhead. The section grows with the copy and the still covers that height.

## Go live
- `/` now serves the preview homepage: girl-in-the-clouds hero, scroll cue, and the What Is This story with the new copy, cookie-and-milk, and cloud field.
- `/what-is-this` redirects to `/#what-is-this`.
- `/for-creators` and `/for-advertisers` use the preview heroes, benefit copy, and the three-step process. The old Lottie graphs stay off.
- Life Giving Pages Work slide uses the membership cloud. Next Steps uses `whoarewebg.png`.

## After go-live
- Homepage hero has gold light rays from both top corners. They sit above the video, vary in width and strength, and pulse over 6 seconds. The video mask was removed because it covered the rays.
- Milk-and-cookie animation removed from What Is This.
- For Creators hero body copy is one step larger.
- For Advertisers benefits are Personal Resonance, Values Aligned Conversion, and World-Making Membership.

## Hero follow-up
- Left gold rays are dimmer. Right rays are more transparent. The two sides use different widths, angles, and blur.
- The brightness filter on the film wrapper was freezing the video. It is removed, and the clip is started on load.
- The hero fades into the sky through a mask on the film wrapper, not a solid color band.
- For Advertisers subhead is the “zoom in with the right audience” line.

## Open
- Preview URLs still exist and now share the live navigation.
