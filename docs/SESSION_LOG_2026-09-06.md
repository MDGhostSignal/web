# Session Log — 2026-09-06

## Vercel Deployment Storage — safe prune

Hit Hobby **Deployment Storage** 10 GB. Optimized without moving live
page media or marketing-library brand statics.

### Done
- Audited `apps/web/public` (~282 MB → **~164 MB**, **−118 MB** per deploy).
- Moved 36 unreferenced / superseded files to local vault
  `assets/vercel-storage-prune/2026-09-06/` (gitignored) and `git rm`’d
  them from `apps/web/public/`.
- Kept live heroes: home `desktop.*`, what-is-this `garden4-optimized` +
  `garden4.webm`, advertisers `loop5.*`, creators `seattle.mp4`,
  invitation-hero videos.
- Left `brand/**` (incl. BrandGuide PDF) and marketing-seeded
  `for-advertisers/loop1–4` / `for-creators/field*` alone.

### Validation
- `npm run assets:audit` — OK (76 referenced assets)
- `npm run typecheck` — OK

### Dashboard (Martin)
- Found **Deployment Retention** under project **Settings → Build and
  Deployment** (not Security). Set all periods to **1 week**.
- Close stale preview branches / PRs still helpful for exceptions that
  keep latest preview per active branch.

### Ship
- Commit + push unused-media prune to `main` so production deploys shrink.

### Optional later
- BrandGuide PDF (~27 MB) + unused marketing `loop1–4` / `field*` only
  after marketing_assets static URLs updated.
