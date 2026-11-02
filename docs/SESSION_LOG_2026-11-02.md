# Session log 2026-11-02

## Mobile pass (public pages, 390px)

Measured overflow and reviewed screenshots for `/`, `/for-creators`, `/for-advertisers`, `/who-are-we`, `/get-in-touch`, `/snowdrift`, `/signal-sheet`. Desktop rules left as they were. Fixes are inside existing `max-width` blocks.

- Homepage hero: subtitle and typing headline no longer forced to one line under 991px, and the 112px left inset drops to 24px.
- Contact band: “STARTS WITH A CHAT” font size reduced under 560px so the reveal line no longer clips.
- For Creators hero: content starts under the header and the hero can grow, so the last lines are not covered by the next section’s chevron.
- Who we are: promise bars graphic no longer locked to a 500px width. The PARTNER-MAKING line wraps below 1024px so the mission paragraph no longer spills past a 320px screen.
- Journey orbit: larger ring and smaller type under 768px.
- Signal Sheet category bar: chips wrap instead of running off the right edge.
- Snowdrift tagline: looser tracking reduced under 768px.

## Files

- `apps/web/src/app/preview/what-is-this/preview.module.css`
- `apps/web/src/components/ContactSection/ContactSection.module.css`
- `apps/web/src/app/for-creators/page.module.css`
- `apps/web/src/app/who-are-we/page.module.css`
- `apps/web/src/components/JourneyOrbit/JourneyOrbit.module.css`
- `apps/web/src/app/signal-sheet/page.module.css`
- `apps/web/src/app/snowdrift/page.module.css`

## Fluid inset

`--edge-pad` is now one clamp below 1200px (16px to 64px, plus safe-area insets). Desktop stays 112px from 1200px up. Per-page stepped overrides removed so every public page shares it. `viewportFit: cover` set in `layout.tsx`.

## Spline logo

Pointer, trackpad, and touch no longer drive the spinning mark on Who Are We or What Is This. `events-target="none"` plus `pointer-events: none` on both wrappers. The auto-spin is unchanged.

## Mobile header logo

At ≤991px the mark was forced to 36px tall while its min-width stayed 57px. The SVG stretches to the box, so the ghost flattened. It now keeps the 57:48 ratio (48×40) inside the hamburger bar.

## Campaign completion alerts

Checked live data. The four Progressive October campaigns that ended 2026-11-01 have open in-app alerts, and Resend shows those emails delivered to Jack and Mike. Nine still-active campaigns have no end date, so they correctly do not notify. Art19 does not return an impression cap for those nine.

## Demo completion button

Campaigns page (Active) has a row “Demo · Campaign completion” with “Preview completion notification”. It opens one in-app Campaign complete bell item and shows the email in a modal. No mail is sent. The backing row is `archived_draft` and excluded from campaign KPIs and the completion cron.

Verified locally: POST returns the subject, the iframe shows 100,000 of 100,000, and the bell lists the demo.

## Impression-cap trigger

Completion now also fires when `listen_count` reaches that campaign's own `maximum_impressions`. End date and Art19 "concluded" still fire. One email per campaign. Campaigns whose end date is older than the 7-day grace stay quiet. Caps Art19 leaves null still cannot fire this way.

## Validation

- Stylelint on those seven files: pass.
- Playwright at 390px: homepage headline and contact line sit inside the viewport.
- `typecheck`, `lint`, and `assets:audit` not run (CSS-only).
