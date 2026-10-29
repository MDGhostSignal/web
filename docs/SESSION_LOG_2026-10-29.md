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

## Open

- Creators romantic-street hero is local only.
- Signed-in browser pass of the live planner still depends on an admin login after Vercel finishes the deploy.
