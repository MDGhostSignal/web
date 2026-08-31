# Session Log — 2026-08-31

## Invitation co-founder bios

Desktop founder cards on `/invitation` (and `/invitation/creators`) were running the full who-are-we bios and overflowing the 2×2 grid. Cut each to one sentence. `/who-are-we` still has the long bios.

- **Mike Sense** — two questions (person / future) and GHOSTSignal as mission, not just a company with friends
- **Jack W Harding** — good creators and good brands finding each other; signals through static
- **Martin Drexler** — award-winning German designer blending craft and impact at the frontier of partnership
- **Jeremy Reeves** — the moment a person sees something new

Local mock at `/invitation/bio-preview` was used to inspect, then removed before commit.

### Files

- `apps/web/src/app/invitation/page.tsx`
- `apps/web/src/app/invitation/creators/page.tsx`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run lint:css`
- `npm run assets:audit`
- Playwright: `/invitation` and `/invitation/creators` show the one-sentence bios; `/who-are-we` still has the long copy
