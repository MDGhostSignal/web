# Session Log — 2026-08-13

## Summary

Public-site work: shipped a new **`/xqrq` landing page** and **trimmed the tail of
`/what-is-this`** down to its "This is the signal" moment, then gave that closing
globe animation more room to breathe before the Platforms band.

Commits (on `main`, pushed to origin):
- `afb999b` feat(xqrq): add /xqrq landing page; trim what-is-this tail
- (this session) chore(what-is-this): more globe tail room + docs(session)

Validation each step: `typecheck`, `eslint`, `stylelint`, `assets:audit` — all
green. Verified live against the local dev server (`/xqrq` and `/what-is-this`
both HTTP 200, clean recompiles).

---

## Part 1 — New `/xqrq` landing page

### What
A focused, single-purpose landing at `ghostsignal.cloud/xqrq` — hero, XQ/RQ
narrative, and the two assessments with CTAs. Built to the user's supplied copy.

Three bands on the shared starry `<ParallaxBackground/>` dark canvas, reusing
`SiteHeader` / `ContactSection` / `Footer`:

1. **Hero** — eyebrow "XQ · RQ", headline **"With Whom Do You Belong?"**
   (line-by-line `SplitLinesReveal`), sub-line "Discover your values to find
   your perfect partner."
2. **Narrative** — the world-making body copy (every business/creator is making
   the world; how do we ensure the right, aligned partnerships?).
3. **Two assessments (two-up)** — XQ and RQ side by side, each with its real
   extruded 3D wordmark (`XQ3DWordmark` / `RQ3DWordmark` reused from the quiz),
   a prose card, availability tag, and its own CTA:
   - **XQ (Conviction Quotient)** — *Free · Open to everyone* → `/xq-quiz`
   - **RQ (Resonance Quotient)** — *Members only · The matching engine* →
     `/rq-quiz`
   Collapses to a single column under 768px.

### Decisions
- **RQ "(?)" resolved as members-only.** The user's copy flagged uncertainty
  ("For members of GHOSTSignal (?)"). Framed the RQ as *Members only* to match
  how `/what-is-this` already positions it, but left the "Take the RQ" CTA as an
  open link to `/rq-quiz`. Open question for a later session: whether the RQ
  should be *gated* (sign-in / invite) rather than an open link.
- **Not added to top nav.** Treated `/xqrq` as a standalone/campaign landing;
  `navLinks` untouched. Did register it in `sitemap.ts` (public, indexable).

### Files
- `apps/web/src/app/xqrq/layout.tsx` (new — metadata)
- `apps/web/src/app/xqrq/page.tsx` (new)
- `apps/web/src/app/xqrq/page.module.css` (new — self-contained, `--gs-*` tokens,
  calc spacing pattern; off-scale widths use the `var(--gs-n-820, 820)` fallback
  idiom, same as `/what-is-this`)
- `apps/web/src/app/sitemap.ts` (added `/xqrq`, priority 0.8)

---

## Part 2 — Trim `/what-is-this` tail

### What
Removed everything below the "This is the signal / everything else is just
static" final section:
- the "What kind of signal do you transmit?" **XQ+RQ teaser** section,
- the "Walk into the world / meet your match in person" **World preview**
  section,
- the "Follow Your Signal" block with its two persona **CTAs** (Creator /
  Advertiser).

**Retained:** Platforms section, contact section, footer. The page now ends at
the globe/"This is the signal" moment → Platforms → Contact → Footer.

### How
- Deleted the three contiguous `<Section>` blocks (201 lines) by verified line
  numbers, with guards asserting the boundary lines before splicing.
- Dropped the now-unused `Wordmarks3D` import. `whitepaperButton` CSS stays
  alive (still used by the harmony/values sections above).
- Left the orphaned section CSS classes in place (safe; not a lint failure) —
  no CSS cleanup pass requested.

### Files
- `apps/web/src/app/what-is-this/page.tsx`

---

## Part 3 — More globe tail room on `/what-is-this`

The closing globe animation fills `.finalSection` (`height: 100%`), so growing
the section's bottom padding grows the globe canvas rather than adding dead
space before the white Platforms band.

- Desktop `.finalSection` `padding-bottom`: **80px → 240px** (+160px).
- Mobile override (previously reset padding symmetrically) given a proportional
  **160px** bottom so the tail survives on phones.

### Files
- `apps/web/src/app/what-is-this/page.module.css`

---

## Notes / open items

- **RQ gating** — decide whether `/rq-quiz` from `/xqrq` should stay an open
  link or move behind sign-in/invite for non-members.
- **`/xqrq` nav entry** — not added; add to `navLinks` if it should be
  discoverable from the top nav.
- Pre-existing unstaged `AGENTS.md` modification was left untouched throughout
  (not part of this session's work).
