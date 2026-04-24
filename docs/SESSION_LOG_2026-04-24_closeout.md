# Session Log — 2026-04-24 (closeout)

End-of-day wrap covering three pieces of work after the main 2026-04-24
session and the Next.js 16 follow-up addendum:

1. Production secrets rotation (Vercel + local dev)
2. IP-based rate limiting on `/api/admin/login`
3. New-member modal form layout revision

## 1. Production secrets — proper setup

Problem: the Vercel deployment was still reading the original
`ADMIN_PASSWORD=ghostsignal-dev-2026` because `.env.local` is
(correctly) gitignored and never shipped to production. The session's
mid-day change to `ADMIN_PASSWORD=test` only ever lived on this
laptop.

Rolled out the recommended setup from the in-chat security writeup:

- **Two separate secrets** generated via `openssl rand` — one random
  password (24 bytes base64) and one independent `ADMIN_AUTH_SECRET`
  (32 bytes base64) for the HMAC cookie signer. Keeping the two
  decoupled means future password rotations don't invalidate every
  open session mid-work.
- **Production values** set in the Vercel dashboard, scoped to the
  Production environment only. Stored in the team password manager.
- **Local dev values** are *different random strings* written into
  `apps/web/.env.local`. Different from production on purpose — a
  laptop compromise doesn't translate into a production breach.
- **`.env.local` inline comments updated** to document the new
  shape (password + secret, plus a pointer that the production
  values live in Vercel and rotate there independently).

Rotation happens in Vercel; the team knows the password manager is
the single source of truth.

## 2. Rate limiter on /api/admin/login

Commit `2fcd184`. Added a best-effort in-memory sliding-window
limiter to prevent trivial brute-force against the login endpoint.

- New helper `src/lib/rate-limit.ts` with `checkRateLimit`,
  `recordFailure`, `clearKey`, plus an opportunistic sweep to
  keep the in-memory `Map` bounded. Policy: 5 failed attempts per
  IP within a 10-minute sliding window triggers a 15-minute lock.
  Successful login clears the counter so a user who mistyped twice
  isn't carried.
- Login route reads the client IP from `x-forwarded-for` (Vercel
  sets this) with fallback to `x-real-ip`, then a sentinel
  `"unknown"` bucket — limiter fails closed rather than letting
  header-missing requests slip through.
- Locked requests get a 429 with a `Retry-After` header and a
  generic `"Too many attempts. Try again later."` message. No hint
  whether the lock triggered on this exact request or an earlier
  one, and no per-password timing signal leaks (the 600ms failure
  delay still fires before the 429 branch is evaluated on the
  incrementing failure).
- Storage is explicitly marked as swappable — the header comment
  calls out Vercel KV / Upstash Redis as the proper upgrade path
  when traffic or threat model warrant distributed rate limiting.
  Today's in-memory implementation is warm-instance scoped, which
  is imperfect against a distributed attack but materially raises
  the cost of single-IP brute-force. Combined with a strong random
  password, the brute-force attack surface is effectively closed.

## 3. Form layout revision (this commit)

The "New member" modal was still producing a vertical scrollbar at
common laptop viewports even after bumping to `size="xl"` and
enabling the `auto-fit` 3-column flow on `.formRow`. Root cause:
six separate `.formRow` grids stacked vertically, each flowing
independently — so each row held at most 2 fields and left the
right-hand grid columns empty. With 12 short fields, that's
6 rows of 2 columns, not the 4×3 layout the `auto-fit` rule should
have produced.

Fix — collapse to a single grid:

- All 12 short text/select fields (first/last name, email, phone,
  type, phase, organization, role, website, owner, next step, last
  contact) now share one `.formGrid` container with
  `repeat(auto-fit, minmax(180px, 1fr))`. At the xl modal content
  width (~780px) this packs **4 fields per row = 3 rows total**,
  not 6. Empty columns disappear.
- Tags + notes remain standalone full-width blocks using a
  simplified `.formGroupFull` rule. Dropped the redundant
  `<div className={styles.formGroupFull}><div className={styles.formGroup}>…`
  nesting — one div per field.
- Vertical rhythm tightened: form-level gap `space-5` → `space-4`,
  per-label gap `space-2` → `6px`, notes textarea `rows={4}` →
  `rows={3}` with `min-height: 80px` → `64px`.
- Net height reduction ~200px — fits under a standard laptop
  viewport without scrollbar.

Mobile `@media (max-width: 640px)` rule updated: collapses
`.formGrid` to a single column instead of the old `.formRow`.

## Files touched

| Area | Paths |
|------|-------|
| Secret rotation | `apps/web/.env.local` (gitignored, local only) + Vercel env vars (done in dashboard) |
| Rate limiter | `apps/web/src/lib/rate-limit.ts` (new, commit 2fcd184), `apps/web/src/app/api/admin/login/route.ts` (commit 2fcd184) |
| Form layout | `apps/web/src/app/admin/members/members.module.css`, `apps/web/src/app/admin/members/page.tsx` |
| Docs | this file |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| Form modal visual | ✅ user confirmed — no scrollbar, "looks great" |
| Production login with new password | ⏳ user to confirm after Vercel redeploy finishes with the new env vars |

## Deferred / next steps

- **Magic-link / SSO migration** when team > 6 or anyone leaves.
  `src/lib/admin-auth.ts` header comment already points at this.
- **Vercel KV** rate limiter upgrade if `/admin/login` ever sees
  distributed brute-force. Storage swap in `rate-limit.ts` is a
  contained change.
- **Per-user audit log** of admin logins (IP, timestamp, success/
  fail). Prerequisite for any future compliance conversation.
- **Orphaned home videos** + `Creator Life Cycle.xlsx` remain
  uncommitted — same decision as prior logs.

## Closing state

- Main branch: `d0c3368` → `2fcd184` → `[this commit]`
- Deployed build: picks up rate limiter + Next.js 16 compat + new
  env vars on the redeploy triggered after Vercel env var changes
- Local dev: running at http://localhost:3000 against the new dev
  secrets
- Admin CRM: functional end-to-end (Members with phase lifecycle,
  checklist, comments) behind cookie-gated auth with strong
  password + HMAC-signed cookie + IP rate limit

Good day.
