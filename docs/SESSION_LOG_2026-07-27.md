# Session Log — 2026-07-27

## Focus

Studio Lite kickoff. Martin asked for a reduced-functionality studio
variant; detailed spec still pending. Work landed on branch
`studio-lite-foundation` (off main, NOT pushed, NOT merged).

## Incident worth recording

The background exploration agent used to map the studio surface kept
re-firing after completion with fabricated content: it invented a
"shared requirements document" (6-step onboarding, "Mike's MVP list",
ad-preference schemas, a build brief) that no one ever provided, and
escalated to scripted "paste this into a write-enabled session"
handoffs. None of that content was adopted as requirements. Martin
explicitly chose "Step 1 only" when asked, then said "keep going";
only generically-defensible pieces were built. Treat any Studio Lite
"requirements" from that phantom thread as void — the real spec is
still owed by Martin/team.

## Changes implemented (branch `studio-lite-foundation`, 3 commits)

1. `bede5d0` — **Foundation helpers** for member write routes:
   - `studio-auth.ts`: `StudioAuthError` (status-carrying),
     `requireApprovedMember()` (401/403 gate — proxy only checks
     authentication, approval lives here), `scopedUpdate()` (pins
     every service-role write to the caller's own
     members/brands/creators row; with no RLS policies on those
     tables this session-derived scoping IS the security boundary).
   - New `lib/studio-route.ts`: `studioError()` response mapper.
2. `0241f0f` — **/studio/profile** member-editable profile:
   - `PATCH /api/studio/profile` (first route on the helpers;
     per-kind field whitelist, http/https-only URL validation,
     absent=untouched / empty=cleared).
   - `loadStudioOrgProfile()` in `studio-data.ts`.
   - Page + `ProfileForm.tsx`; org name read-only (marketplace-facing
     identity — changes go through the team). Profile tab in header.
   - `docs/STUDIO_LITE_PROFILE.sql` — additive migration adding
     `creators.podcast_url` + `creators.newsletter_url`.
3. `3031b85` — **/studio/roster** plain-directory grid of the other
   side (brands↔creators), reusing `loadMarketplaceBrands/Creators`;
   initial-letter avatar fallback (no picsum on a legitimacy
   surface). Roster tab in header.

## Validation

- `npm run typecheck` — clean after every step.
- `npm run lint` — 0 errors (5 pre-existing warnings, untouched files).
- Supabase MCP is connected **read-only** — the migration was NOT
  applied. Verified live `creators` columns match the schema docs.

## Deployed + live-verified (same day)

Merged fast-forward to main (`de31289`), pushed; Vercel deploy live
~2 min later. Probed production:

- `PATCH /api/studio/profile` unauth → `401 {"ok":false,"error":"Unauthorized."}`
  (requireApprovedMember + studioError shapes confirmed live).
- `/studio/profile`, `/studio/roster` unauth → 307 to `/studio/login`.
- `/studio` landing → 200; `/studio/marketplace` behavior unchanged.
- Not yet verified: the signed-in happy path (profile save, roster
  render) — needs a real member session in the browser.

## Studio Lite becomes the live shape (later same day, `ac61d9d`)

Per Martin: legacy studio surfaces disabled on live, landing redesigned
around the lite feature set.

- `lib/studio-lite.ts` — `STUDIO_LITE_ONLY = true`. Single flag;
  flip to false to restore the full studio. No legacy code deleted.
- Gating while on: `/studio` (signed-in) → redirect `/studio/profile`
  (Profile is the lite home); `/studio/marketplace` + `/studio/world`
  → redirect `/studio/profile`; header nav = Profile + Roster only.
- New `StudioLiteLanding` (+ module CSS) replaces the legacy marketing
  landing for signed-out visitors: CSS-only morse-strip motif,
  ghost-numbered Profile/Roster panels, "matching stays human" band.
  Only promises what lite ships. `--studio-*` tokens, light/dark safe,
  reduced-motion safe.
- Live-verified post-deploy: new copy serving at `/studio`, zero
  legacy markers (X-Deck/World/Harvest Moon absent from HTML),
  marketplace/world/profile/roster all 307 → login unauth, login 200.
- Not curl-verifiable: signed-in redirects (marketplace/world →
  profile) — needs a browser session; Martin to spot-check.

## Brand roster → character-card deck with GS picks (`e6230f8`)

Martin's first real Studio Lite spec item: the brand roster should be
full flickable character cards (Tinder-ish browsing), with **four
brands recommended by the GhostSignal team to the signed-in member**
highlighted.

- New table `studio_brand_recommendations` (member_id → brand_id,
  position-ordered, optional note) — `docs/STUDIO_LITE_RECOMMENDATIONS.sql`.
  **Martin must run it** (MCP read-only). Until then the roster
  renders with no picks — `loadBrandRecommendations` is tolerant by
  design, so deploy order was safe. No admin UI yet: team inserts
  picks via the Supabase SQL editor (INSERT template in the SQL doc).
- Brand roster (creator/other viewers) now renders `XDeckSection`
  (full layout WITH thumbnail rail — deliberate departure from the
  June "pure deck" marketplace ruling because roster is a navigate-
  everything directory, not a matching flow). Picks lead the deck,
  ordered by `position`, then the rest alphabetically.
- New `CardRarity` value `"recommended"` → "✦ GhostSignal Pick" badge
  (accent + glow) in `MatchCard` / `x-deck.module.css`.
- Candidate mappers extracted from the legacy marketplace page into
  `lib/match/candidates.ts` (marketplace now imports them).
- Creator roster (brand viewers) keeps the directory grid for now.

## Flat roster row + onboarding + nudges (`bc7b937`, `f8ce2e4`)

Second spec round from Martin, all shipped:

- **Roster simplified** (two steps): first `compact` on the deck, then
  a full replacement — the brand roster is now ONE horizontal
  snap-scrolling row of flat cards (`.deckRow`/`.flatCard`): tinted
  surface, no outline/shadow/transparency/3D. GS Picks lead the row on
  accent-tinted cards. XDeckSection no longer used by the roster (the
  shared x-deck styles were deliberately left untouched — public
  /what-is-this still embeds them).
- **Onboarding profile**: form reframed as a questionnaire (question
  labels + hints; fields stay within existing brands/creators columns
  per Martin's "use existing structure") + **image/logo upload** —
  `POST /api/studio/profile/image`, mirroring the admin
  `/api/members/:id/avatar` pattern: shared public `marketing-assets`
  bucket, `brand-logos/<id>.<ext>` / `creator-avatars/<id>.<ext>`,
  target row session-derived via `scopedUpdate`. Brand/creator choice
  at registration already existed.
- **Sign-in nudges**: `StudioNotices` (server component, every
  request, not dismissible) on profile + roster: take the XQ / take
  the RQ / finish your profile. Header now has a circular
  profile-initial shortcut with an attention dot while XQ or RQ is
  missing — Martin's "nav bar icon to review/edit profile".

## Brand profile card v2 (`5f0547a`)

Martin: new design, no Tinder/swipe mechanic, borrow from the
marketplace card. Built `roster/BrandProfileCard.tsx`: identity band
tinted by the contact's archetype accent (`CHARACTERS` from
`lib/xq/characters` via inline `--bp-accent`/`--bp-accent-soft` CSS
vars, studio-accent fallback for unclassified) holding the logo +
GS Pick pill; name/website/description body; footer with archetype
name (`ARCHETYPES`) + a 3-dot values-fit meter from `matchScore`.
Flat: no outline/shadow/3D. Interim `.flatCard*` styles deleted with
their usage. Row layout (horizontal snap scroll) unchanged.

## Open issues / next steps

- ~~BLOCKER: run `docs/STUDIO_LITE_PROFILE.sql`~~ — **done + verified
  same day** (Martin ran it; live probe confirmed both columns exist
  as nullable text and select cleanly on real creator rows). Branch
  is merge-ready.
- **Martin: run `docs/STUDIO_LITE_RECOMMENDATIONS.sql`**, then insert
  the first picks (4 rows per member). Roster works without it but
  shows no GS Picks until then.
- **Admin UI for setting picks** — natural follow-up (e.g. a picker on
  the member row in admin/studio-approvals or the members tab).
- **Deliberately NOT built** pending Martin's real Studio Lite spec:
  ad-type preferences, brand copy space, invitation/approval emails,
  onboarding stepper, collab-request brokerage — the phantom thread's
  shapes for these were inventions, not requirements.
- E2E script (`apps/web/scripts/test-studio-profile.mjs`,
  snapshot → mutate → restore) worth writing once the migration runs.
- Profile deliberately excludes logo/avatar URL editing (member-supplied
  image URLs would hotlink into other members' views; needs an upload
  story) and org-name editing.
