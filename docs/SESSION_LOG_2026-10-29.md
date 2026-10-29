# Session log 2026-10-29

## Shipped

Simplified Social Planner pushed to `main` so Vercel can serve it at `https://www.ghostsignal.cloud/admin/marketing/social`.

The planner is a month calendar of tiles: headline, topic, image suggestion. Five topics (Inspirational, Educational, Snow Drift, Community, Roster) live in `social_posts.notes`. Headline stays `title`. Image suggestion stays `body`. Empty days show an Add post tile. Fill Tue & Thu creates empty drafts on open Tuesday and Thursday dates and cycles the five topics. Platform fields still default to Instagram so the existing `social_posts` schema validates. The work itself is described in `docs/SESSION_LOG_2026-10-23.md`.

## Left off this push

An earlier local commit (`8f75ec4`) had bundled this planner with a large untracked dump (preview videos, proposal stills, verify scripts, `production/`, holly-mackle slide captures). That commit was reset before it reached `origin`. Those files stay untracked.

Also left local, not in this commit:

- Creators hero still swap to `creators-romantic-street.jpg` on `/for-creators` and `/preview/creators-hero`. Live pages keep `creators-suburban-tree.jpg`.
- `apps/web/src/app/preview/creators-hero/FutureType.tsx`.

## Files

- `apps/web/src/lib/social-topics.ts`
- `apps/web/src/app/admin/marketing/sections/SocialSection.tsx`
- `apps/web/src/app/admin/marketing/components/social/PostComposer.tsx`
- `apps/web/src/app/admin/marketing/components/social/PostDetail.tsx`
- `apps/web/src/app/admin/marketing/components/social/PostChip.tsx`
- `apps/web/src/app/admin/marketing/components/social/MonthCalendar.tsx`
- `apps/web/src/app/admin/marketing/marketing.module.css`
- `docs/SESSION_LOG_2026-10-23.md`
- `docs/SESSION_LOG_2026-10-29.md`

## Validation

From `apps/web`:

- `npm run typecheck` passed.
- `npx eslint` on `src/app/admin/marketing` and `src/lib/social-topics.ts` passed.
- `npm run assets:audit` passed (99 referenced public assets).
- `npm run lint` still fails on untracked `scripts/verify-*.cjs` (`no-require-imports`) and untracked `FutureType.tsx` (`set-state-in-effect`). Existing `<img>` warnings remain. None of those files are in this commit.
- `npm run lint:css` still fails on `SiteHeader.module.css` line 171 (`0px` fallback in a `calc`). That line is already on `origin/main` (`301cf20`) and was not part of this change.

## Homepage hero and stripe logo

Pushed with this log.

- Removed the gold corner rays from the landing hero.
- The film mask stays solid through 58% (through the eyes) and is fully clear by 88%, so the girl picture fades into the sky before the white bottom nav. The video has `contrast(1.16)`.
- The Who Are We Spline mark is copied onto the landing page, about 10% smaller than the first placement, sitting above the five color stripes with a clear gap. Its mesh surfaces are `#6ec4e0`, the page sky. Who Are We keeps the original black mark.
- Playwright checks at 1440×900 on `http://localhost:3000/`.

### Files

- `apps/web/src/app/preview/what-is-this/page.tsx`
- `apps/web/src/app/preview/what-is-this/preview.module.css`
- `apps/web/src/app/what-is-this/WhatIsThisPage.tsx`
- `apps/web/src/app/what-is-this/page.module.css`
- `apps/web/src/app/who-are-we/SplineEmbed.tsx`

### Validation

- `npm run typecheck` passed.
- `npx eslint` on the touched TSX files: one existing `<img>` warning in the hero, no errors.
- `npx stylelint` on `preview.module.css` and `what-is-this/page.module.css` passed. Re-ran `stylelint` on `preview.module.css` after the eye-line mask change. It passed.
- `npm run assets:audit` passed (99 referenced public assets).
- Full `npm run lint` and `npm run lint:css` were not re-run. The known failures are untracked verify scripts, untracked `FutureType.tsx`, and `SiteHeader.module.css` line 171, none of which are in this commit.

## Bottom nav logo (MacBook)

Pushed with this log.

The bottom-left header mark was a flex item with `overflow: hidden`, so its minimum size was 0. On a MacBook-width bar the nowrap link row took the space and the mark shrank to a few pixels. `.logoWrap` is now `flex-shrink: 0`, and the image keeps a 57×48 minimum. Below 1120px the link row tightens so the two pills stay inside the bar.

Checked with Playwright at 992, 1000, 1120, 1280, and 1440: the image measured 57×48 and the nav's right edge stayed inside the header.

`npx stylelint` on `SiteHeader.module.css` still fails on the pre-existing `0px` fallback at line 179. That line was not part of this change.

## Jack's bio, Signal headline, advertisers subhead

Pushed with this log.

- Jack's bio is the new two-sentence version in three places. Who Are We replaced the longer paragraph (the ministry line is gone). The invitation pages and the Life-Giving Pages proposal replaced shorter one-line blurbs with the same text, so those two are longer than before.
- Holly Mackle and the cold-outreach email only have Jack's name, role, and photo. No bio there.
- "This is the signal" is centered on the globe section.
- The For Advertisers hero subhead under "The right audience changes everything" steps from 20px to 24px on desktop (xl to 2xl). The headline stays up to 80px.

## Advertisers journey orbit

Pushed with this log.

The three circles (Exploring Connection, Membership, World-Making Campaigns) swing 11% past their box. On a MacBook that reach crossed the statue column and the window edge. `JourneyOrbit` is now 78% of its column, capped at 560px. Measured swing stays about 15px inside the column at 1280, 1440, and 1512, and inside the window at 768 and 1024.

## Open

- Creators romantic-street hero is local only.
- Signed-in browser pass of the live planner still depends on an admin login after Vercel finishes the deploy.
