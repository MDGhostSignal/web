# Session log 2026-10-23

## Social planner

- Simplified `/admin/marketing/social` into a calendar of tiles: headline, topic, image suggestion.
- Five topics: Inspirational, Educational, Snow Drift, Community, Roster. Stored in `social_posts.notes`. Headline stays `title`. Image suggestion stays `body`.
- Month cells with no post show an Add post tile. Fill Tue & Thu creates empty drafts on open Tuesday and Thursday dates, cycling the five topics.
- Existing calendar, API, and `social_posts` table kept. Platform fields still default to Instagram so the current schema validates.

## Files

- `apps/web/src/lib/social-topics.ts`
- `apps/web/src/app/admin/marketing/sections/SocialSection.tsx`
- `apps/web/src/app/admin/marketing/components/social/PostComposer.tsx`
- `apps/web/src/app/admin/marketing/components/social/PostDetail.tsx`
- `apps/web/src/app/admin/marketing/components/social/PostChip.tsx`
- `apps/web/src/app/admin/marketing/components/social/MonthCalendar.tsx`
- `apps/web/src/app/admin/marketing/marketing.module.css`

## Validation

- `npm run typecheck` passed.
- Lint, CSS lint, and assets audit not run.
- Browser check of the signed-in planner not completed (admin login required).

## Creators hero

- Replaced the dusk street on `/for-creators` and `/preview/creators-hero` with `apps/web/public/images/preview/creators-romantic-street.jpg` (rosier street, varied houses, F-150 on the right). The previous still `creators-suburban-tree.jpg` stays in the repo.

## Still open

- Page animations (page not named).
- Advertisers hero.
- Landing hero golden-rays sharpness.
