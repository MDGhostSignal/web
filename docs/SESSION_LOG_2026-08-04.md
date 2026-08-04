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

## Open issues / next steps
- DEPLOY BEFORE SENDING REAL INVITES: emailed links point at
  www.ghostsignal.cloud, which won't accept invite tokens until this
  ships. Links in today's preview emails dead-end at login until then.
- Fuller Studio spec (ad prefs, brand copy space, brokerage) still
  pending Martin.
