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

## Rate & Revenue Calculator

Replaced the Signal Fidelity ballpark on `/admin/art19/cpm` with Jack's 70/30 direct-ad-sales desk (budget + position/length/creative → brand CPM/impressions, creator 70%, GS 30%). Info button (`IconHelp`) opens a plain-language modal. Rate-card constants live at the top of `cpm/page.tsx`.

### Files

- `apps/web/src/app/admin/art19/cpm/page.tsx`
- `apps/web/src/app/admin/art19/cpm/page.module.css`
- `apps/web/src/app/admin/art19/page.tsx` (tool link)
- `apps/web/src/app/admin/pages/page.tsx` (inventory copy)

### Validation

- `npm run typecheck` — pass
- ESLint on the touched admin files — pass
- Playwright (logged-in `/admin/art19/cpm`): default mid-roll host-read 30s @ $1,500 → $45.50 CPM / $1,050 creator / $450 GS; info modal opens; Pre-roll updates to $32.50; Campaigns tool link points here; mobile stacks

## ART19 daily listens — Bill replied

Bill offered Custom Reports (manual) or the daily S3 export (automated). We want the S3 path so `/admin/art19` last-30d lights up every morning. Click-through to create the bucket: `docs/ART19_S3_BUCKET_SETUP.md`. Not created yet — no AWS login on this machine. Next: Martin creates the bucket, then email Bill name + region.
