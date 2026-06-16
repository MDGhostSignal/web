# Session Log — 2026-06-16 (Studio ↔ World integration + theming)

Second addendum to the 2026-06-16 logs. The morning log captured the
auth-flow fixes (login panel, /auth/callback, obfuscation detection,
recovery page, SQL unblock). This log captures the rest of the day:
bridging Studio identity into the multiplayer world, building richer
profile cards, light/dark mode for the Studio shell, and a small
mountain of polish.

Net: a brand or creator can sign into Studio, see their RQ + XQ
profile reveal-style on the dashboard, walk into the world with their
real name and archetype, press E on another authenticated player to
read their dossier, and toggle the whole surface between light and
dark with one click.

## 1 · Studio ↔ World identity bridge

Five-piece chain that connects the Studio's authenticated session to
the Phaser/Colyseus game server so players show up as themselves, not
as random Guests.

**WorldRoom.onAuth (game-server/src/rooms/WorldRoom.ts).** Validates
the optional Supabase access token via the REST `/auth/v1/user`
endpoint, looks up the linked `members` row, and returns
`{ kind: "authed", authUserId, displayName, archetype, rqCode,
memberType, organization }`. Missing or bad tokens fall through to
`{ kind: "guest" }` so the public `/world` page still works without
auth. Service-role REST call is used directly (no `supabase-js` dep)
to keep the game-server bundle small for the Fly.io deploy.

**PlayerData schema extended** with `authUserId`, `rqCode`,
`memberType`, `organization`. Broadcasts at 10 Hz unchanged.

**/studio/world page** (apps/web/src/app/studio/world/page.tsx) loads
the member, reads `access_token` from the cookie-bound session, and
passes a new `identity` prop to `WorldClient`. The page is a
flex-column: StudioHeader takes natural height, `.gameArea` is
position-relative flex:1, and `WorldClient` renders inside with
`windowed=true` so the world fills exactly the space below the
header (no hardcoded header height, no decorative frame).

**WorldClient(identity)** stashes the identity on a ref so the
Phaser scene's connect() reads the latest value at join time
without re-running the outer useEffect. Connect passes
`{archetype, displayName, token}` in joinOptions; the server
re-validates token in onAuth.

**/api/studio/players/[authUserId]/summary** — auth-gated GET that
returns the rich `{firstName, lastName, organization, memberType,
xq, rq}` payload. Joins members → xq_submissions + rq_submissions.
Service-role read after the viewer passes the trust check.

**openOtherCard(sessionId)** in WorldClient now branches on
`playerSnapshots.get(sessionId).authUserId`. Guests get today's
generic archetype card; authed players show a "Loading dossier…"
state, fetch the summary, then render the real XQ tagline + value
chips + RQ signal clarity + undertone via the extended
`CharacterCard` (`rich: PlayerRichSummary | "loading" | null`).

**Archetype resolve fallback (three layers).** Discovered that
`members.xq_archetype` is a denormalization that wasn't being
written when the XQ quiz was submitted, so every authed user
without a recent backfill had a null archetype and ended up with a
random color in the world:

- `/studio/world` page: when `member.xqArchetype` is null but
  `xqSubmissionId` is set, hydrate the code from `xq_submissions`
  before handing it to WorldClient.
- `WorldRoom.onAuth`: same fallback server-side. Server is the
  trust boundary; client hints can lie.
- `/api/xq-submissions linkSubmissionToMember`: now PATCHes both
  `xq_submission_id` AND `xq_archetype` onto the matched member
  row so future submissions backfill the denorm automatically.

The XQ-submission write path was only setting `xq_submission_id`,
never `xq_archetype` — that's the root cause. Fix lands at three
levels so the bug stays dead even if one layer drifts.

## 2 · Neutral character for unclassified players

Players without an XQ on file no longer get a fake random archetype
in the world. Added `NEUTRAL_ARCHETYPE` sentinel ("NEUTRAL") that's
distinct from the 8 codes:

- `ARCHETYPE_COLOR.NEUTRAL = 0x9aa0a8` (desaturated stone gray).
- `ARCHETYPE_SHAPE.NEUTRAL = "circle"` (plain head badge).
- Server `normalizeArchetype()` defaults to NEUTRAL (was "X-S-L"
  Architect — misrepresented every unclassified player as the
  platform-tier).
- Client `connect()` uses NEUTRAL when no identity hint.
- E-key `CharacterCard` adds an "Unclassified" entry with copy
  pointing at the XQ + RQ quizzes.

`pickArchetype()` survives for any debug surface that still wants a
random demo color (e.g., `/x-deck` carousel).

## 3 · Town-square statue + mounted-rider polish

**Statue placement.** New `statue.png` (600×513 stone figure holding
the GhostSignal logo plaque) drops at the town-square plaza.
Final position after iterative nudging: 263px west, 15px north of
math-center. Scale 0.5, origin (0.5, 1.0). Depth 30 so the silhouette
covers characters walking behind it but sits below chat bubbles (50)
so speech still reads from any angle. Hidden + restored alongside
the village backdrop on interior enter/exit.

**Mount-hide body.** When the player mounts a horse, the LPC sprite +
glow + shadow + halo all hide. Only the archetype head badge + name
label remain — reads as a floating head riding the horse. Dismount
restores everything. Implementation: `spawnAvatar` stashes the body-
only parts on the container via `setData("bodyParts")`; a new helper
`setAvatarMounted(container, mounted)` flips visibility.

## 4 · Dashboard RQ + XQ profile cards

The post-quiz reveal screen has a rich format (3D portrait, archetype
theming, value buckets, axis graph). The dashboard cards used to be
trimmed-down chip lists. Now they mirror the reveal:

- `XqProfileCard` (server component) — archetype-themed CSS vars
  from `lib/xq/characters`, `XQCharacter3D` portrait, code chip,
  archetype name, tagline, three value-bucket pill rows tinted
  per-bucket (red non-negotiables, archetype core, purple
  aspirational).
- `RqProfileCard` (client component — needs `RQResultsGraph`
  hooks) — code chip, RQ name, signal-clarity badge with
  high/medium/low tints + note, the full axis-bar
  visualization, undertone row.

`loadStudioRqSummary` was extended to hydrate `details_json` +
`profile_json` so the graph can render server-rendered without a
second fetch. The shape matches the `RQResult` the standalone
quiz reveal consumes.

Dashboard `max-width` 1200 → 1600 with 48px side padding so the
page actually uses the screen. Cards initially stacked, reverted
to side-by-side per user preference.

## 5 · XQ quiz reveal + email theming

- `/xq-quiz` `ResultsScreen` now passes `variant="3d"` so the reveal
  uses `XQCharacter3D` (the actual portrait) instead of the
  simplified logo `XQCharacterMark`.
- `sendUserSummaryEmail` reveal card was hardcoded teal (#0a7794)
  regardless of archetype. Now pulls `accent` + `accentSoft` from
  `lib/xq/characters` so the gradient, border, name color, tagline
  color, and eyebrow label all match whichever archetype the user
  landed on. Bucket-row colors (non-neg / core / asp / bg) stay as
  the semantic palette since those are category-coded not
  archetype-coded.

## 6 · Marketplace deck — trim the surface

UX research: deck (Tinder-style) + long list of candidates is the
worst of both worlds — they serve different mental models. Per
industry pattern (Tinder/Bumble/Hinge use pure deck; LinkedIn
Recruiter / Apollo use pure list-detail), pick one. The deck IS the
brand here.

Added `compact` prop to `XDeckSection`. Currently:
- Studio `/marketplace` passes `compact` → hides the `ThumbnailRail`
  (the long horizontal candidate strip). The `MatchCardDetail`
  panel under the active card stays — it's the per-card summary +
  connect CTA that turns "flicking" into action.
- Standalone `/x-deck` preview + XQ results embed keep the full
  layout (rail + detail).

First pass dropped both; user feedback restored the detail panel.

## 7 · Studio light/dark mode

Built a parallel `--studio-*` token system mirroring the admin
tokens:

- `apps/web/src/app/studio/studio-tokens.css` declares
  `--studio-bg`, `--studio-surface-1/2/hover`, `--studio-border`,
  `--studio-border-strong`, `--studio-text-primary/secondary/muted`,
  `--studio-accent`, `--studio-accent-soft`, `--studio-success`,
  `--studio-warning`, `--studio-danger`, etc. Defined at
  `.studio-root` with a `.studio-root[data-theme="dark"]` override
  (true dark surfaces, punchier accents, deeper shadows).
- `layout.tsx` imports the tokens globally and wraps the shell
  with `studio-root` class.
- `studio.module.css`, `XqProfileCard.module.css`,
  `RqProfileCard.module.css`, `studio/world/world.module.css` all
  read `var(--studio-*)` instead of hardcoded hex.

`ThemeToggle` (lives in `components/admin/ThemeToggle.tsx`) was
extended to also stamp `data-theme` on every `.studio-root` in
addition to `.admin-root` + `<html>`. One shared preference in
localStorage flips both surfaces in lockstep. Studio defaults
LIGHT, admin defaults DARK — the toggle handles the asymmetric
attribute semantics (admin: no attribute = dark; studio: no
attribute = light).

`ThemeToggle` lands in the StudioHeader trail next to Sign out.

**x-deck light variants.** The `MatchCardDetail` panel under the
deck used `--xd-*` tokens for text/border/accent (tokenized
correctly) but its surface backgrounds were hardcoded
`rgba(255, 255, 255, …)` overlays — invisible on the light Studio
shell. Added scoped overrides under
`.studio-root:not([data-theme="dark"]) .section` that flip the
`--xd-*` palette to light AND replace each white-overlay rule on
`.detail`, `.axisTrack`, `.axisTrackMid`, `.valueChip`, and the
ghost-CTA hover with the matching `rgba(15, 23, 42, …)` equivalent.
Standalone `/x-deck` and the XQ results embed keep their original
dark styling (their host pages are dark).

## 8 · Still open / next pass

- **Colyseus → Fly.io deploy** (task #13). `/studio/world` only
  connects to `ws://127.0.0.1:2567` until that lands. `WorldRoom`
  expects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  on the Fly side — without those `onAuth` warns and falls back to
  guest for every join.
- **Forgot-password link** on `/studio/login` calling
  `auth.resetPasswordForEmail({ redirectTo: '/studio/reset-password' })`.
- **Supabase password-recovery email template** to point at the
  recovery page directly so future recoveries don't need the
  manual URL-edit trick from the morning's auth-flow log.
- **MatchCard + MatchDeck light variants.** The deck's actual cards
  may still have dark-only hardcoded styling — this pass only
  themed the `MatchCardDetail` panel under it. Worth a sanity pass.

## Commits this session (in order)

- `b13d877` — structured login error panel
- `1b29068` — `/auth/callback` route + `emailRedirectTo`
- `6a0a022` — obfuscated re-signUp detection + explicit resend
- `65b3112` — `/studio/reset-password` page
- `0093dac` — docs: 2026-06-16 studio auth flow addendum
- `ce398cb` — Studio ↔ World identity bridge (5 pieces)
- `a26ba6d` — XQ + RQ summary cards on dashboard (v1)
- `f1e8de4`, `474fb8e` — windowed world iterations
- `c7c824e` — resolve archetype from xq_submissions fallback
- `649b3cf` → `a2ec7cf` — statue placement + nudges
- `0ab72fb` — neutral gray character for unclassified players
- `1ddae16` — mount-hide body when riding
- `ba52278` — 3D variant on XQ reveal
- `9bf31b9` — per-archetype email palette
- `27cbc95` — reveal-style dashboard cards (XQCharacter3D +
  RQResultsGraph)
- `2bcc692`, `7c31796` — stack then unstack profile cards
- `5b1831e` — light/dark mode + trim marketplace deck
- `aa04e77` — restore `MatchCardDetail` under compact deck
- `c0351f1` — x-deck light-mode overrides
