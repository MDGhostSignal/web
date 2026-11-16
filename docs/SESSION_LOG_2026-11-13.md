# Session Log — 2026-11-13

## Summary

Rebuilt `/xq-preview` as the public tease for the consolidated XQ (Part One + Part Two). Main nav “XQ Quiz” now opens that page.

## Changes

- `/xq-preview` uses the experimental XQ cream shell (`XqFrame` + `xq.module.css`): hero “With Whom Do You Belong?”, Continuity/Change archetype map with the eight locked plates, and a notify email form.
- `POST /api/xq-notify` sends a Resend notification to `XQ_NOTIFY_TO` / `CONTACT_EMAIL_TO` / `hello@ghostsignal.cloud` (same pattern as contact).
- `navLinks` “XQ Quiz” → `/xq-preview`.
- Sitemap adds `/xq-preview`; `/xqrq` stays reachable at lower priority.

## Files touched

- `apps/web/src/app/xq-preview/page.tsx`
- `apps/web/src/app/xq-preview/page.module.css`
- `apps/web/src/app/xq-preview/layout.tsx`
- `apps/web/src/app/xq-preview/NotifyForm.tsx`
- `apps/web/src/app/api/xq-notify/route.ts`
- `apps/web/src/lib/nav.ts`
- `apps/web/src/app/sitemap.ts`
- `docs/SESSION_LOG_2026-11-13.md`

## Validation

- `npm run typecheck` — pass
- eslint on changed files — pass (1 pre-existing-style `@next/next/no-img-element` warning, same as experimental plates)
- `npm run lint:css` — fails on pre-existing `SiteHeader.module.css` px; preview CSS clean
- `npm run assets:audit` — OK (103)

## Verification

- `http://localhost:3000/xq-preview` renders hero, Continuity/Change map, eight plates, and notify form.
- Homepage nav includes `/xq-preview`. Homepage body still has other `/xq-quiz` CTAs (unchanged).
- `POST /api/xq-notify` returns 400 for empty / invalid email.

## Open

- Live `/xqrq` chooser is unchanged; still reachable by URL.
- Notify emails go through Resend only (no waitlist table yet).
- Full click-through browser pass not available here (no browser MCP); verified via HTTP content checks.
