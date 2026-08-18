# Session Log — 2026-08-18

Member-identity consolidation (Elizabeth Santelmann's stranded XQ/RQ),
a linking guardrail so it can't happen silently again, a reusable merge
tool, and a slower/more-elegant cold-email roster GIF.

## Elizabeth Santelmann — "XQ/RQ results don't show in the Studio"

**Reported:** a client's customer couldn't see their assessment results in
the Studio. Turned out to be Elizabeth Santelmann (Sunshine In My Nest).

**Root cause — split identity across emails + duplicate member rows.** She had
**three** `members` rows:

- `57c12486` (creator `8a2768ec`, email **sunshineinmynest@gmail.com**) — her
  real CRM record: XQ (`fdefc343`, C‑P‑C) **and** RQ (`e795fb8f`) both done,
  contract signed, full lifecycle, phase "sign". But **no auth**.
- `7aae0a5b` (creator `2078719e`, email **elizabeth.santelmann@gmail.com**) —
  her actual **Studio login** (auth `095d3c92`, activated 08‑14). Empty of
  results, 0 child references.
- `ded64326` — old empty stub (one `crm_alert`).

The Studio resolves a member by `auth_user_id`, then reads XQ/RQ from *that*
row. Her login sat on the empty shell, so results (stranded on the CRM row via
the **quiz email**) never surfaced. Not a code bug — an identity split: she
took the quiz under one email and logged in under another, and results link by
exact single-email match.

**Fix (non-destructive first, then cleanup):**
1. Rebound her login onto the canonical CRM record: moved `auth_user_id` +
   `activated_at` + avatar + podcast fields onto `57c12486`, nulled auth on the
   shell. Her login now resolves to the record that already holds XQ+RQ+contract.
2. Consolidated the duplicates with the new merge tool (below): repointed the
   stub's `crm_alert` to the survivor, deleted `7aae0a5b` + `ded64326`. She is
   now **one** row, appearing correctly everywhere.

All writes went through a service-role script — **the Supabase MCP is
read-only**, so it can diagnose but not mutate.

## Guardrail — links never fail silently again

Both `linkSubmissionToMember` (XQ, `api/xq-submissions/route.ts`) and
`linkRqSubmissionToMember` (RQ, `api/rq-submissions/link-member.ts`) previously
**silently skipped** when an email matched 0 or >1 members — that's how a
result strands invisibly. Now they return a `LinkOutcome`
(`linked | no_match | ambiguous | skipped`), and both completion paths:
- `console.warn` a greppable `[xq-link]/[rq-link] … not auto-linked` line, and
- pass the outcome to the admin notification email, which renders a **⚠️
  warning banner** ("Not auto-linked to a member … link it by hand, or this
  result won't show in their Studio"). RQ has two completion paths (POST +
  `[id]` PATCH upgrade) — both updated. Happy path unchanged.

## New tool — `apps/web/scripts/merge-members.mjs`

Reusable consolidation for the low-volume duplicate case:
`node scripts/merge-members.mjs [--dry] <survivorId> <loserId...>`. Snapshots,
repoints every member-referencing child row (contracts incl. `suggested_member_id`,
crm_alerts, member_comments, studio_brand_recommendations, studio_contact_requests)
loser→survivor, then deletes losers. **Refuses to delete a loser that still holds
an `auth_user_id`** (can't orphan a live login). Does not merge scalar fields —
carry those to the survivor first, then run this to clean up.

Design note: full self-serve "claim with a different email (verified code)" flow
+ a `member_emails` table were scoped but **deferred** — volume is low, so the
visibility guardrail + manual merge tool is the right-sized answer. `members.id`
(UUID) is already the durable central identifier; the work is only ensuring one
human → one row when emails differ.

## Cold-email roster GIF — slower + more elegant

The animated roster (`public/images/email/outreach-roster.gif` + `-dark`) was
rotating too fast. Re-captured from the live `/invitation` carousel with a
**slower eased slide + a dwell** so each client rests in centre: 6-frame slide
(cubic-bezier) + 5-frame hold per card, 13 cards, encoded at 9 fps →
**~1.2s per card**, 500×181, 143 frames, ~16s loop, **1.9 MB** (was ~0.5s/card).

## Validation

- `tsc --noEmit` + `eslint` clean on all six touched submission files.
- Elizabeth: verified one row holds her auth with XQ+RQ; duplicates gone.

## Open / next

- Optional: build the verified claim-flow + `member_emails` if this recurs.
- Still open from 08‑17: Sunshine duplicate rows **(resolved today)**;
  `/for-advertisers` reorder; the ART19 migration video (brief written, in Grok).

## Follow-up — invitation hero background video + polish

- **Cold-email preview at true size** (`admin/outreach`): the preview modal was
  `lg` (640px) and pinched the 584px email. Bumped it to `xl` (880px) and the
  iframe renders the email at its native width (centred, taller), so it's
  full-size and readable for Mike instead of scaled down.
- **3-card roster GIF**: the 5-card fan made each card too small to read.
  Re-captured the `/invitation` carousel as a **3-up** (bigger cards: centre +
  one each side; `--card-w`/`--shift-1` overridden, outer pair hidden), cycling
  the full roster slowly (~1.5s/card, 6fps, ~2.0 MB). Names/blurbs/XQ read now.
- **Hero background video** on `/invitation`:
  - Removed the spinning glyph + GHOSTSignal wordmark, briefly went left-third,
    then reverted the headline + subhead to **centred** (per Martin).
  - Added a full-bleed looping **cloud video** behind the hero via a new
    reduced-motion-aware client cmp `HeroBackgroundVideo.tsx` (muted · autoplay ·
    loop · playsInline; `prefers-reduced-motion` → poster still, no video fetch).
    Section is `position:relative; isolation:isolate; overflow:hidden;
    min-height:min(86vh,880px)`, content centred over it; a soft **white radial
    scrim** keeps the dark headline crisp on the bright clouds.
  - **Optimized the source** (`assets/grok/video/cl-invitation-locked.mp4`,
    4.9 MB) → `public/videos/`: **WebM/VP9 200 KB** + **MP4/H.264 1.3 MB**
    fallback + **32 KB poster** (ffmpeg, `-an`, faststart).
  - **Brought back the spinning mark** on top of the signal bar — but *just* the
    logo, no tile/shadow. Its white ground defeated `mix-blend-mode:multiply`
    (white × white scrim = white), so keyed the white out into a transparent
    **APNG** (`public/images/brand/logo-spin-transparent.png`, 176 KB, full
    alpha) via `colorkey=0xffffff:0.12`.
- **Roster popup banner taller**: `.profileBanner` 224 → **300px** and
  `.profileCard` padding-top 160 → 236 (same +76, so the disc keeps its ~64px
  overlap) — portrait banners (The Pivot, Holly Mackle) no longer crop faces.

All lint/typecheck clean. `next dev`'s auto-regenerated `AGENTS.md` block left
uncommitted (not our change).

## Follow-up 2 — co-founder hover + The Rabbit Room logo/name

- **Co-founder tiles** now get the same mouse-over as the three feature tiles:
  `.founderCard` gained the −4px lift + soft drop shadow + violet border on a
  220ms transition (added to the `prefers-reduced-motion` off-switch too).
- **The Rabbit Room** roster card:
  - Name "Rabbit Room" → **"The Rabbit Room"** in `RosterCarousel.tsx`.
  - Replaced the pixelated **28×28** logo with the official **rabbit-and-pipe
    roundel** at **192×192** (pulled from rabbitroom.com's favicon; transparent
    corners, the pipe reads clearly). `rabbit-room-logo.png` 386B → ~14KB.
- ⚠️ Note: the email's 3-card roster GIF is a baked capture, so it still shows
  the OLD Rabbit Room logo + name — regenerate it when the email needs to match.
  **(Resolved:** regenerated the 3-up GIF so the email now shows "The Rabbit
  Room" + the new roundel.)

## Follow-up 3 — hero video swap + cold-email feedback (Jack + Martin)

- **New hero background video** on `/invitation`: swapped in a new Grok cloud
  clip (`assets/grok/video/grok-video-d4da...mp4`). Trimmed the first **1s**
  (15→14s), cropped 1088→1080, stripped audio, and ran the same optimization →
  same `public/videos/invitation-hero.*` filenames (no code change): **WebM
  488KB + MP4 1.7MB + 48KB poster** (from 12MB). Same bright-cloud look, so the
  dark headline + scrim treatment holds.
- **Cold email — Jack's + Martin's feedback** (`lib/cold-outreach-email.ts` +
  `api/admin/outreach/route.ts`):
  - **Sends from a human**: `from` is now `Mike from GHOSTSignal
    <mike@ghostsignal.cloud>` (was the `noreply@` RESEND_FROM) — reads personal
    AND replies just work (same monitored inbox). Env-overridable via
    `OUTREACH_FROM`; reply_to aligned to match.
  - **Subject** (Martin): `"{name}, you have been invited to join GHOSTSignal"`
    (fallback drops the name), replacing "…your brand on the right podcasts".
  - **Inbox preview = the personal note**: added a hidden preheader so the
    snippet is Mike's message, not the wordmark/headline.
  - **Reply cue** (Jack): footer now says "Want to talk? Just hit reply — it
    goes straight to Mike, a real person on our team" (HTML + text).
  - **Trimmed** the roster caption to "Brands in blue, creators in ember."
    (dropped "a card for every client on the network" — Jack).
  - ⚠️ Verify a test send: sending *from* mike@ works because the domain is
    Resend-verified, but confirm inbox placement before a real batch.
