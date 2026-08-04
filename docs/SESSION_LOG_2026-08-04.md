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

### Landing lede — Martin's final copy (fourth push)
- Hero lede replaced with: "The GHOSTSignal Studio is where members
  set up their profile, complete the XQ/RQ alignment quiz, and manage
  account details—the essential first step to building partnerships
  you can be proud of."

### Validation (late afternoon)
- typecheck / lint clean; preview endpoint verified: new welcome copy
  + 0 lowercase GhostSignal in the rendered invite email; /studio
  clean except the site-wide og:site_name meta.

## Evening session (final)

### Landing lede iterations (pushed as they arrived)
- 2bc429d: Martin's new hero lede ("The GHOSTSignal Studio is where
  members set up their profile, complete the XQ/RQ alignment quiz,
  and manage account details—…").
- f217dea: "quiz" → "quizzes" (Martin sent "quizes"; corrected
  spelling applied with his OK implied — flagged in chat). NOTE: the
  invite email's welcome template still says "quiz" singular (Jack's
  copy) — left on purpose, Martin aware.
- Both verified live on prod after deploy.

### Supabase confirm-signup template — studio visual system (d33d618)
- docs/STUDIO_EMAIL_TEMPLATES.md "Confirm signup" refreshed: same
  card system as the invite email (wordmark + STUDIO pill, morse
  strip, purple Outlook-safe CTA), what's-inside box now pitches
  profile / XQ-RQ alignment quizzes / account details with the
  "(Setup takes ≈ 20 mins)" note (old roster/picks line removed),
  GHOSTSignal casing throughout, compact Snowdrift starry ad added.
- Invite-email section of the doc rewritten for the tokenized flow.
- **Martin pasted subject + body into Supabase Dashboard →
  Authentication → Emails → Confirm signup and saved** — the live
  confirmation email now matches the studio UI. Reset-password
  template in the doc is current but NOT yet re-pasted.

### Preview emails sent (Resend, template placeholders resolved)
- Confirm-signup preview → heymatvond@gmail.com (id 3d94c2c3…) and
  jack@ghostsignal.cloud; sample data (greeting by name, org "The
  Preview Show"), CTA pointed at /studio/login instead of a real
  confirmation link. Approved by Martin ("Perfect").

### Working-tree note
- AGENTS.md / app/page.tsx / motion/index.ts show as modified with
  whitespace-only diffs (trailing newline + CRLF from an editor
  save) — not part of today's work, deliberately left uncommitted.

## Evening session 2 — RSS pipeline + Jack's account reset

### Jack's account investigation + reset (Supabase admin API)
- Diagnosed: deleting a CRM members row does NOT remove the Supabase
  auth account; re-signup then silently sends no email (account
  already confirmed → nothing to resend). Deleted auth users
  jack@stthomascambridge.org and jackwharding@icloud.com (iCloud CRM
  row kept but unlinked/deactivated per never-hard-delete rule).
  Orphan auth account jack@ghostsignal.cloud still exists (Martin
  aware). Invite welcome copy also pluralized to "quizzes" (ab9cdc0).

### First-login RSS + notices (Martin's ask)
- StudioNotices: "Three minutes." removed from the Take-your-XQ bar.
- /studio/profile: RSS input now renders for EVERY creator-kind
  member — including fresh invitees with no creators row (previously
  hidden because org fell back to the personal card).
- PATCH /api/studio/profile: lazy-creates + links the creators row on
  first RSS save (name from CRM organization, seeded with the save's
  tagline/description; pre-migration column fallbacks kept).
- CRM display: /admin/contacts ContactCard shows an "RSS feed" row
  for creator contacts (GET /api/members now embeds
  creators(rss_url), fallback to plain select; sanitizePayload strips
  the embed on writes) and the /admin/studio-members dossier org card
  shows an "RSS feed" ExtLink.
- Verified: embed live on 79 linked contacts; 0/53 creators have
  rss_url yet (expected — nobody has saved one).

## Evening session 3 — newsletter-ads capture

### NL-advertising opt-in (Martin's ask, evolved mid-build)
- Register page (invited flow): "I am interested in Email Newsletter
  Advertising" checkbox → reveals provider / open rate / frequency /
  subscriber-size inputs (`.optIn*` classes in studio.module.css).
- Same block on /studio/profile (prefilled via `loadMemberNlAds`,
  always-sent on save so unticks/clears persist).
- Storage: 5 new members columns in docs/STUDIO_NL_ADVERTISING.sql —
  **NOT yet run in prod (Martin to run)**; register + profile routes
  retry without the NL fields until then (console.warn, never fails
  the signup/save).
- RSS display in CRM switched to spelled-out plain text (Martin's
  ask): contacts card shows the raw URL (`.rssValue`, break-all) and
  the studio dossier shows an "RSS <url>" line (`.rssLine`) instead
  of a compact ↗ link.

### Follow-ups shipped same evening
- STUDIO_NL_ADVERTISING.sql run by Martin, verified (columns +
  sentinel-row write/readback/delete).
- NL answers displayed in CRM: contacts card rows + dossier
  "Newsletter advertising" section (member select extended).
- "Do you run a newsletter?" field removed from /studio/profile.
- Podcast-info block added above the NL opt-in on /studio/profile
  (creator-kind only): current host / avg downloads per episode /
  frequency / audience size → 4 new members columns in
  docs/STUDIO_POD_INFO.sql (loader renamed loadMemberIntake, covers
  nl_* + pod_*; tolerant fallbacks everywhere). Pod info displayed in
  both CRM surfaces (only when any value present).

### Pod-question merge (final shape)
- "Avg downloads per episode" + "Current audience size" merged into
  one "Average listens per month" question (pod_monthly_listens;
  docs/STUDIO_POD_LISTENS.sql adds it and drops the two empty
  columns). Profile, PATCH route, loader, dossier + contacts display
  all updated (625f123).
- All three intake migrations (NL_ADVERTISING, POD_INFO,
  POD_LISTENS) run by Martin and sentinel-verified. Final members
  intake columns: nl_ads_interest/provider/open_rate/frequency/
  subscribers + pod_provider/monthly_listens/frequency.

## Night session — Cold Outreach tab (new big feature, Mike's)

- New top-level /admin/outreach tab (scaffolded via the new-admin-tab
  skill; placed right after Contacts — brand onboarding is the
  current company focus; new paper-plane IconOutreach).
- Composer modal: name / email / personal message → POST
  /api/admin/outreach files a cold_outreach row then sends via
  Resend; duplicate-email guard (409 + "Send anyway" confirm); Resend
  failure marks the row status 'failed'. "Preview email" renders the
  exact send-side HTML (POST /api/admin/outreach/preview, sandboxed
  iframe) — same UX as the studio invite modal.
- List view: DataTable (Name / Email / Message / Status badge /
  Sent), sortable, refetches after each send.
- Email template: lib/cold-outreach-email.ts — branded shell
  (wordmark, morse strip, purple CTA → /for-brands, courtesy
  opt-out line) around Mike's personal message; subject + pitch box
  are marked PLACEHOLDER — final copy is the next step.
- Schema: docs/OUTREACH_SUPABASE_SCHEMA.sql (cold_outreach table,
  RLS on, indices) — NOT yet run; the tab shows a one-time-setup
  hint and the send API refuses cleanly until it exists.
- Proxy matcher: /api/admin/outreach/:path* (cookie gate).
- Smoke-tested on dev: 401 unauth, tableMissing tolerance, preview
  rendering (greeting/message/line breaks/pitch/CTA), clean refusal
  on send without the table, page renders.
- new-admin-tab skill updated: effect-fetch guidance now warns about
  the react-hooks/set-state-in-effect lint rule (async IIFE +
  refresh-counter pattern).

## Open issues / next steps
- RUN docs/OUTREACH_SUPABASE_SCHEMA.sql — the Outreach tab needs the
  cold_outreach table before Mike can send.
- Cold-outreach email copy: subject + pitch box in
  lib/cold-outreach-email.ts are placeholders — write the real email
  next (Martin: "the email itself we will build next").
- Reset-password Supabase template: re-paste from
  docs/STUDIO_EMAIL_TEMPLATES.md when convenient (doc is current).
- Snowdrift snowfall GIF for the invite/confirm emails — parked;
  approach = baked animated GIF, frame 1 = static starry card.
- Invite welcome copy says "quiz" singular vs landing "quizzes" —
  align if Jack/Martin want.
- Fuller Studio spec (ad prefs, brand copy space, brokerage) still
  pending Martin.
- Whitespace-only edits to AGENTS.md / page.tsx / motion/index.ts
  sitting in the working tree (see note above).
