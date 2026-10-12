# Session log 2026-10-12

## Changes
- Published a noindex preview tree at `/preview` for the team meeting.
- Homepage test: `/preview/homepage-test-not-live` (lady blink video, split typing headline, What Is This underneath).
- Also included existing local hero previews: `/preview/advertisers-hero`, `/preview/creators-hero`.
- Live `/`, `/what-is-this`, `/for-advertisers`, and `/for-creators` stay on their current public versions.

## Files
- `apps/web/src/app/preview/`
- `apps/web/src/app/HomeTypingLoop.tsx`
- `apps/web/src/app/what-is-this/page.tsx`
- `apps/web/public/images/preview/lady-earbuds.jpg`
- `apps/web/public/images/preview/lady-earbuds-blink.mp4`
- `apps/web/public/images/preview/advertisers-glory-drift-1080-45s.mp4`
- `apps/web/public/images/for-creators/evening-yard.mp4`

## Validation
- `npm run typecheck` passed.
- `npm run lint` failed only on untracked `scripts/verify-*.cjs` require() errors, plus existing warnings. Those scripts were not committed.
- `npm run lint:css` passed.
- `npm run assets:audit` passed.

## Next
- Live visual pass stays local until Martin approves a full publish.
