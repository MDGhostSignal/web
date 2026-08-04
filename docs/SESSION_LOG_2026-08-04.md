# Session Log — 2026-08-04

## Changes implemented

### Client portfolio on the Studio Lite landing (public)
- New "Client portfolio / The company we keep." section on `/studio`
  (logged-out landing), between the "Two surfaces" panels and the
  "Handled for you" band.
- Click-through stacked card deck showing ALL brands + creators
  (interleaved; 107 brands / 53 creators at build time), with
  prev/next controls, live counter, and a color legend.
- Color coding is tokenized: `--studio-brand-accent[-soft]` (blue) /
  `--studio-creator-accent[-soft]` (ember) added to
  `studio-tokens.css` (light + dark); cards carry "Brand"/"Creator"
  chips, tinted morse strip + logo disc.
- Data via existing `loadMarketplaceBrands(null)` /
  `loadMarketplaceCreators(null)`; section renders nothing if empty.
  NOTE: this makes client names/logos/blurbs public by design.

### Landing copy / CTA edits (Martin's calls)
- Hero lede shortened to "Studio is the GhostSignal members' workspace."
- "Create your account" buttons removed (hero + closing CTA);
  "Sign in" / "Sign in to Studio" now use the purple primary style.

### Studio is now INVITE-ONLY
- New flag `STUDIO_INVITE_ONLY = true` in `lib/studio-lite.ts`
  (flip-to-restore, same pattern as the other studio flags).
- `/studio/register` closed to the public: proxy exemption removed
  (unauthed → login) unless the URL carries `?invite=`; the page is
  now a server gate that verifies the token; `POST /api/studio/register`
  403s without a valid matching token; login page swaps "Sign up" for
  invite-only copy. Nothing deleted.

### Tokenized, prefilled invites (CRM → email → register)
- `lib/studio-invite.ts` — HMAC-SHA256 signed invite tokens
  (`STUDIO_INVITE_SECRET` fallback `SUPABASE_SERVICE_ROLE_KEY`),
  30-day expiry, no DB schema change.
- Admin "+ Invite member" form now collects member type
  (Creator/Brand), show/brand name, contact person + email; the CRM
  row is stamped with `member_type` + `organization` (blanks filled,
  existing data kept).
- Invite email links to `/studio/register?invite=<token>`; the
  register page prefills all fields and LOCKS email + member type
  (the team's CRM choice is authoritative — API enforces token kind).
  Form split into `register/RegisterForm.tsx` + server `page.tsx`.

### Invite email template + preview
- Email HTML extracted to shared `lib/studio-invite-email.ts`
  (send route + preview + client default text — single source).
- New "Welcome text" field in the invite form: prefilled with
  `defaultInviteWelcome(kind, orgName)` (live-follows type/org until
  edited → becomes personal; "Reset to template" reverts); sent
  verbatim, line breaks preserved.
- New cookie-gated `POST /api/admin/studio/invite/preview` returns
  the exact send-side HTML; "Preview email" button renders it in a
  sandboxed iframe (lg modal) with Back / Send actions.

## Files touched
- `apps/web/src/app/studio/ClientPortfolio.tsx` + `.module.css` (new)
- `apps/web/src/app/studio/StudioLiteLanding.tsx`, `studio-tokens.css`
- `apps/web/src/app/studio/register/page.tsx` (rewritten as server gate),
  `register/RegisterForm.tsx` (new), `login/page.tsx`
- `apps/web/src/lib/studio-lite.ts`, `studio-invite.ts` (new),
  `studio-invite-email.ts` (new)
- `apps/web/src/proxy.ts`
- `apps/web/src/app/api/studio/register/route.ts`
- `apps/web/src/app/api/admin/studio/invite/route.ts`,
  `invite/preview/route.ts` (new)
- `apps/web/src/app/admin/studio-members/InviteMemberButton.tsx`,
  `page.module.css`

## Validation
- `npm run typecheck` / `lint` / `lint:css` / `assets:audit` — all
  clean (5 pre-existing warnings elsewhere, unchanged).
- Live dev-server probes: portfolio renders 160 cards; register gate
  matrix (no/garbage/valid token × page + API, wrong-email 403) all
  correct; preview endpoint 401s unauthenticated, renders template
  and personal welcome correctly.
- Preview invite emails sent: jack@ghostsignal.cloud via the real
  route (temp CRM row snapshot→deleted, table verified unchanged);
  heymatvond@gmail.com via direct Resend (route correctly 409s it —
  already has a Studio account).

## Afternoon session (same day, second push)

### Studio landing pared to hero-only (Martin's call)
- `StudioLiteLanding` now renders topbar + hero only — everything
  below the hero's Sign in button removed: "Two surfaces" panels,
  the client-portfolio deck (built this morning), "Handled for you",
  closing CTA. `ClientPortfolio.tsx` + module CSS and the
  brand/creator accent tokens stay in the repo (unrouted); section
  wiring lives in git history (9e15cfe) if it comes back.

### Snowdrift ad in the invite email
- Compact version of the RQ-results email's starry Snowdrift card
  added as the last row of the invite email (shared template
  `lib/studio-invite-email.ts`, so the CRM preview shows it too):
  white logo, "GHOSTSignal transmission" line, Substack subscribe CTA.
- Logo served from www.ghostsignal.cloud (canonical), not the old
  preview domain.

### Email asset domain fix (spotted during the above)
- All 6 references to the stale `web-nine-fawn-27.vercel.app` preview
  domain in `api/rq-submissions/emails.ts` (chart base URL, logo,
  Mike GIF, Snowdrift logo) and `api/xq-submissions/emails.ts` (logo,
  Mike GIF) now point at `https://www.ghostsignal.cloud`. Every
  target verified 200 on the canonical domain first (including
  /api/rq-chart returning image/png).

### Validation (afternoon)
- typecheck / lint clean; landing verified hero-only on dev server;
  Snowdrift block verified in the invite preview endpoint output.

## Late-afternoon session (third push)

### GHOSTSignal brand casing (Martin's call)
- Every user-visible "GhostSignal" → "GHOSTSignal" across the studio
  surface (landing, login, register, reset-password, pending, welcome
  splash, roster/BrandDeck/BrandPanel, migration guide, portfolio
  card, StudioHeader, layout metadata title, legacy StudioLanding)
  and the emails: invite email (wordmark, team lines, subject), XQ/RQ
  result emails (titles, logo alt, footer), match-deck fallback
  pitches. `BrandedGhostSignal` identifier guarded; CSS comments left.
- `docs/STUDIO_EMAIL_TEMPLATES.md` updated too — NOTE: the live
  Supabase dashboard auth templates still say GhostSignal until
  Martin re-pastes them.
- Deliberately left as-is (Martin: "leave as is"): site-wide
  `og:site_name = "GhostSignal"` (root layout, affects all pages) and
  admin-internal CRM alert emails.

### Invite email welcome template — Jack's final copy
- `defaultInviteWelcome()` now returns Jack's 12:06 text verbatim
  ("Welcome! The GHOSTSignal team would like to invite you to
  Studio—… (Setup takes ≈ 20 mins)"). Now static — no longer
  interpolates show/brand name (signature changed to no-args; all 3
  call sites updated; CRM hint copy adjusted).

### Considered, skipped for now
- Snowfall animation in the email's Snowdrift ad: the RQ-page version
  is JS canvas (dead in email); CSS animation only survives Apple
  Mail. Viable route documented = baked animated GIF (frame 1 = the
  static starry card as Outlook fallback). Martin: skip for now.

### Validation (late afternoon)
- typecheck / lint clean; preview endpoint verified: new welcome copy
  + 0 lowercase GhostSignal in the rendered invite email; /studio
  clean except the site-wide og:site_name meta.

## Open issues / next steps
- Real invites can be sent from /admin/studio-members once this push
  is deployed (tokens already accepted on prod since the morning).
- Supabase dashboard auth templates: re-paste from
  docs/STUDIO_EMAIL_TEMPLATES.md to pick up GHOSTSignal casing.
- Snowdrift snowfall GIF for the invite email — parked, approach
  documented above.
- Fuller Studio spec (ad prefs, brand copy space, brokerage) still
  pending Martin.
