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
- The film mask stays solid through 40% and is fully clear by 78%, so the girl picture fades into the sky before the white bottom nav.
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
- `npx stylelint` on `preview.module.css` and `what-is-this/page.module.css` passed.
- `npm run assets:audit` passed (99 referenced public assets).
- Full `npm run lint` and `npm run lint:css` were not re-run. The known failures are untracked verify scripts, untracked `FutureType.tsx`, and `SiteHeader.module.css` line 171, none of which are in this commit.

## Open

- Creators romantic-street hero is local only.
- Signed-in browser pass of the live planner still depends on an admin login after Vercel finishes the deploy.
