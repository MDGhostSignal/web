# Session Log — 2026-07-30

## Summary

Studio Lite design day: the ART19 migration board got its brand-purple
redesign and viewport-filling layout, the brand roster was rebuilt as a
flickable baseball-card deck (old card styles retired), the brand detail
view became a docked side panel with keyboard navigation, and the admin
Studio Members page gained a safe "Remove from Studio" flow.

## 1. Migration board redesign (`/studio/migration`)

- Replaced the four mixed step accents (amber/pink/teal/purple) with a
  **GhostSignal brand-purple ramp** — light lavender (step 1) → deep
  violet (step 4) — defined per `:nth-child` in the CSS module with
  dark-theme overrides (accents no longer hard-coded in the TSX data).
- Removed the colored top bars on the step tiles. Each tile now carries
  its shade via: gradient wash background, tinted border, filled number
  badge, oversized ghost watermark numeral (CSS counter), tinted timing
  chips, and tinted checked-off items.
- Layout now fills the viewport below the 64px studio header
  (`min-height: calc(100dvh - 64px)`, steps grid flexes); densities
  loosened across the board (gaps, padding, font sizes +1 notch).
- Files: `apps/web/src/app/studio/migration/{MigrationGuide.tsx,migration.module.css}`

## 2. Roster → baseball-card deck (`/studio/roster`, brand roster)

- **Deleted** `roster/BrandCardBrowser.tsx` (flat wcCard grid). Martin
  explicitly dislikes both the old welcome-card grid and the legacy
  X-Deck 3D cards — neither style returns to /studio.
- New `roster/BrandDeck.tsx` + `roster-deck.module.css`: portrait 5/7
  card stack after Motion.dev's card-stack pattern (`motion/react`,
  already a dependency — zero new packages). Cards never unmount;
  depth = index, drawn with transform/opacity/zIndex. Flick threshold:
  110px offset or 520 velocity; card flies off, tucks under the pile.
- Card face: neutral studio surfaces + XQ archetype accent as "team
  colors" (thin inner frame, logo disc, stat footer with archetype +
  values-fit dots). GS Picks lead the deck with the ✦ badge.
- `BrandCardFace` (with `standalone` prop) is shared with
  /studio/profile's "how the network sees you" preview — profile and
  roster always render the same card.
- **Detail view**: `BrandModal` → `roster/BrandPanel.tsx`, a non-modal
  side panel **docked right of the deck** (Martin: never overlay the
  card). Keyed to the top card, so navigating re-points it. Intro
  request flow unchanged. Stacks below the deck under ~1100px.
- **Keyboard**: ← → arrow keys flip the deck (window keydown; ignored
  when focus is in input/textarea/select or contentEditable). Keycap
  hint (`<kbd>` icons) under the deck explains it.
- Controls row: prev/next arrows, "n of N" counter, "Full story" toggle.

## 3. Admin: remove Studio members (`/admin/studio-members`)

- Dossier modal footer: **"Remove from Studio"** with two-step confirm
  (arm → confirm/cancel), error surfaced inline; on success the modal
  closes and the list refreshes.
- New `DELETE /api/admin/studio/members/[id]` — **deactivation, not a
  row delete**: nulls `activated_at` (the documented kill switch).
  Member drops off the list, next studio request → /studio/pending.
  CRM row, quiz links, auth account, picks, request history survive;
  reversible via Approvals or re-invite. Covered by the existing
  `/api/admin/studio/:path*` proxy cookie gate (method-agnostic).
- Files: `apps/web/src/app/admin/studio-members/{MembersTable.tsx,page.module.css}`,
  `apps/web/src/app/api/admin/studio/members/[id]/route.ts`

## 4. Admin: row-level remove on the members list

- The studio-members table gained an actions column: per-row "Remove"
  button with an inline are-you-sure step ("Remove from Studio? Their
  marketplace card stays." → Yes/Cancel, errors inline, row click
  isolated). Same DELETE endpoint as the dossier flow — deactivation
  only. Verified the marketplace loaders (`loadMarketplaceBrands/
  Creators`) read brands/creators directly with no activation filter,
  so removed members keep their marketplace pool presence.

## 5. Migration page → "Migration and Tutorial"

- Studio nav tab renamed to **Migration and Tutorial**.
- New tutorial section vertically below the migration board (below the
  fold, board still fills the first screen): "Once you've moved in:
  publishing on ART19." — three numbered steps (Log in / hit New
  Episode top-right · Publish episode / upload + name + details ·
  Insert 6 ad markers: 2 pre, 2 mid at a break, 2 post), each with a
  wide framed screenshot; outro "And that's good to go — we handle
  everything else."
- Real screenshots landed same evening (Martin's captures of the
  GHOSTSignal Test Series account): wired as
  `public/images/studio/art19-tutorial/step-{1-login,2-publish,
  3-ad-markers}.webp` with true per-image dimensions (step 3 is
  ~1107×907, squarer than the two ~1800×911 shots) and accurate alt
  text; placeholder PNGs deleted. Content verified to match the step
  order before wiring.

## 6. Studio onboarding splash (`/studio/welcome`)

- First-login setup gate: the roster redirects incomplete members to
  the new welcome splash. Complete = XQ done + RQ done + image +
  description + (creators) RSS feed URL. Completing the last item
  auto-redirects into the roster; "Skip for now" sets a
  `studio-welcome-skip` cookie (7 days) the roster honors.
- Splash (welcome.module.css, studio tokens, purple radial backdrop):
  hero with progress chips, XQ/RQ quiz tiles (live DB state, ✓ +
  archetype/code when done, window-focus refresh flips them), card
  form with image upload, per-kind placeholder description textarea,
  and — creators only — the RSS feed URL field ("required" pill;
  operationally important: the feed the team imports into ART19).
- All writes reuse the member-scoped APIs. PATCH /api/studio/profile
  accepts `rssUrl`; new column via `docs/STUDIO_LITE_RSS.sql`
  (**Martin-run, still to apply**) — until then reads fall back and
  the PATCH retries without rss_url, returning `pendingRss` which the
  splash surfaces. RSS also editable on /studio/profile.
- `studioOnboardingStatus()` in studio-data.ts; null org (read
  failure) counts as complete so a DB hiccup never traps anyone.
- `?preview=1` skips the completeness redirect for inspection.
- Files: `studio/welcome/{page.tsx,WelcomeSplash.tsx,welcome.module.css}`,
  `lib/studio-data.ts`, `api/studio/profile/route.ts`,
  `studio/profile/ProfileForm.tsx`, `studio/roster/page.tsx`,
  `studio/StudioHeader.tsx`, `docs/STUDIO_LITE_RSS.sql`

## 7. Profile quiz tiles restyled

- /studio/profile's XQ/RQ "fill me out" reminder tiles now use the
  same visual language as the welcome splash quiz tiles (shared
  welcome.module.css classes) — one look for the reminder wherever a
  member meets it. Done-state summaries unchanged.

## 8. Account ops

- Reset the studio password for Martin's test creator account
  (heymatvond@gmail.com) via the Supabase auth admin API after
  invalid-credentials failures (auth logs showed the attempts came
  from the prod site login; account was healthy). Verified the new
  password authenticates; Martin advised to rotate it.

## Validation

- `npm run typecheck` — clean
- `npm run lint` — 0 errors (5 pre-existing warnings in unrelated files)
- `npm run lint:css` — clean
- `npm run assets:audit` — OK, 53 referenced assets exist
- Live-inspected on local dev server (roster, profile, migration all 200)

- (evening batch) typecheck / lint / lint:css / assets:audit re-run
  clean after items 4–7; welcome + roster + migration probed on the
  local dev server.

## Closed same day

- `docs/STUDIO_LITE_RSS.sql` applied to prod by Martin and verified
  via information_schema — creators.rss_url live; the code's
  column-missing fallbacks are dormant.
- Real ART19 tutorial screenshots wired in (see section 5).

## Open issues / next steps

- Consider a self-serve "Forgot password?" flow on /studio/login —
  members will hit what Martin hit today.

- Orphaned `wc*` grid classes remain in `studio.module.css`
  (`wcGrid`, `wcShowMore`, `wcCard`, `wcLogo`, `wcPick`, `wcText`,
  `wcName`, `wcSince`, `wcTagline`, `wcCardActive`, `rosterCard`) —
  the panel still uses the `wcDetail*` family, so cleanup needs the
  repo's union-check discipline (see AGENTS.md orphan-CSS trap).
- Flick feel (thresholds/fly-off speed) tunable if Martin wants it
  snappier after using it more.
- True member purge (auth account + CRM row) deliberately NOT built —
  separate flow if ever needed.
