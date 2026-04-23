# Session Log — 2026-04-23

Content-focused pass across `/what-is-this`, `/for-creators`,
`/for-advertisers`, and `/who-are-we`. Hero rework on
`/what-is-this`, several body-copy replacements, tile reorder on the
Advertisers business case, and a small mission-section motion add on
`/who-are-we`.

## Outcomes

### `/what-is-this`

**Hero headline — new line structure.**
Replaced the 4-line "Values-based / podcast / advertising / network"
stack with three independently-revealing lines:

1. `<BrandedGhostSignal />` — brand typography (GHOST bold uppercase,
   Signal thin 100, opacity 0.85). The `.signal` class's
   `text-transform: none` correctly wins over the parent
   `.heroHeadline`'s `uppercase` cascade.
2. `is the values-based`
3. `podcast advertising network`

Each line wrapped in its own `SplitLinesReveal` (staggered delays
0 / 0.6 / 1.2s, duration 1.8). Went through two intermediate shapes
mid-session:

- First pass was `GhostSignal is the` / `values-based` /
  `podcast advertising network` before the user asked for
  `GhostSignal` alone on line 1.
- `.headlineLine` got `white-space: nowrap` (desktop/tablet) so the
  long bottom line can't wrap; overridden back to `normal` at ≤768px
  so it wraps rather than overflowing on mobile.

**Hero text container — widened.**
`PODCAST ADVERTISING NETWORK` at the clamped max font (72px bold
uppercase) was clipping its final `K` inside SplitType's
`overflow: hidden` `.line` wrapper. Fixes:

- `.heroTextOverlay` width 50% → **82%** at desktop; 55% → **90%**
  at ≤1024px. Overlay now covers part of the video area on the
  right — acceptable since copy is white over a dim sunset loop.
- `.heroTextContainer`: removed the ~700px max-width entirely,
  switched to `width: 100%`. The token scale tops out at
  `--gs-n-900`, so a 1200–1500px token-native clamp wasn't
  available; letting the container fill the widened overlay is
  cleaner than fabricating a non-existent token value.

**"What if advertising could make harmony" section — body replaced.**
Single 2-paragraph body swapped for the new 4-paragraph copy:

1. "We connect podcasters and brands who love the same things."
2. "Every story told, ad placed, and partnership formed is an
   intentional act of world making. …"
3. "We go beyond algorithmic targeting in search of deep resonance.
   So, we've developed the Resonance Quotient (RQ) …" (curly
   apostrophes in source as `&rsquo;`).
4. "This is genuine alignment: creators keep their voice, brands
   keep their conviction, and audiences sense harmony instead of
   interruption."

Each wrapped in a `ScrollFadeUp` with indices 0–3 so they stagger in
sequence. The user's parenthetical note about a
triangle/circle diagram was treated as a design hint, not ship copy,
and left out — flagged in chat.

**"Values Create Value" section — body replaced.**
Single paragraph swapped for two shorter paragraphs, the second
citation-heavy (Acoglu 2023 + Edelman 2025). Flagged "Acoglu" as a
probable spelling of Daron Acemoglu in chat; preserved user's
wording.

**"Who is GhostSignal?" section — body replaced.**
Swapped to new copy; rendered the inline brand mention as
`<BrandedGhostSignal />` so it inherits the split brand-typography
treatment (matches the headline directly above).

### `/for-creators`

- **Administrative Freedom tile**: dropped the parenthetical
  `(including transparent revenue splits)`. New reads
  "We handle the paperwork, contracts, reporting, and payment
  tracking so you are freed up to create."
- **Journey tile 03 (RELATIONSHIP)**: `'Resonance Index'` →
  `'Resonance Quotient'`, and `ensuring the partnership feels
  natural` → `ensuring our partnership feels natural`. Left the
  earlier "Every partnership is curated" untouched — user's
  instruction was scoped to the later `the partnership` mention.

### `/for-advertisers`

- **Business-case tile order** (the `features` array rendered in the
  business section). Old:
  Highly-Attuned → Administrative Simplicity → Real Conversion →
  Targeted Spending. New:
  **Highly-Attuned Audiences → Targeted Spending →
  Administrative Simplicity → Real Conversion.**
- **Journey tile 03 (RELATIONSHIP)**: `'Resonance Index'` →
  `'Resonance Quotient'` (matches the `/for-creators` rename).

### `/who-are-we`

- **Partner-Making headline**: removed the final `FORCE` line
  entirely (including its own `SplitLinesReveal` wrapper). The first
  line's text went from `GHOSTSIGNAL IS A` → plain `IS A` → final
  `<BrandedGhostSignal /> IS` (two edits across two turns — user
  asked for the brand treatment, then asked to drop the trailing
  `A`). Final reading: **"GhostSignal IS / PARTNER-MAKING"** with
  the existing handshake-hyphen animation between `PARTNER` and
  `MAKING` intact.
- **Mission section clouds** added. Mirrors the pattern already in
  use by the hero and promises sections: 3 `<Image>` copies of
  `/images/who-are-we/cloud.png` inside a new `.missionCloudWrapper`,
  each with the shared `.floatingCloud` base class plus the existing
  `cloudFloat1 / 2 / 3` keyframes at 150 / 180 / 200s. Per-cloud
  positions tuned to the shorter mission section: top-left / mid-right
  / bottom-left with opacities 0.22 / 0.18 / 0.15 and blur 1–2px.
- CSS: `.missionSection` gained `position: relative; overflow: hidden`
  so clouds anchor to it rather than the page. `.missionContent`
  gained `position: relative; z-index: 1` so the sticky headline +
  body stay above the drifting layer.
- `export const metadata.description` on `/who-are-we` still reads
  "GhostSignal is a partner-making force." — left as-is because
  it's an SEO meta string, not displayed.

## Files touched (high-level)

| Area | Paths |
|------|-------|
| `/what-is-this` hero + body copy | `src/app/what-is-this/page.tsx`, `src/app/what-is-this/page.module.css` |
| `/for-creators` tile + journey copy | `src/app/for-creators/page.tsx` |
| `/for-advertisers` tile order + journey copy | `src/app/for-advertisers/page.tsx` |
| `/who-are-we` mission section | `src/app/who-are-we/page.tsx`, `src/app/who-are-we/page.module.css` |
| Docs | `docs/SESSION_LOG_2026-04-23.md` |

## Validation (final state)

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 49 referenced public assets resolve |
| Manual browser walkthrough | ✅ hot-reload confirmed on `/what-is-this` hero during iteration |

## Non-goals / deferred

- **Homepage hero**: was edited mid-session before the user clarified
  the `/what-is-this` scope, then fully reverted (typing-loop hero
  and `.heroHeadline` with `text-transform: uppercase` are exactly
  as they were after 2026-04-22). No remaining homepage diff.
- **Orphaned home videos** (`blackcloud2.*`, `city.mp4`,
  `cloud.*`, `cloudblack.mp4`, `country.mp4`, `twoclouds.mp4`,
  `cloud-optimized.mp4`) are still untracked in
  `apps/web/public/images/home/` — same decision as the 2026-04-22
  log. Will need a cleanup pass to decide which are referenced and
  which are junk.
- **`Acoglu` → `Acemoglu`** in the `/what-is-this` "Values Create
  Value" citation. Flagged; not changed without explicit approval.
- **`metadata.description` on `/who-are-we`** still references the
  now-deleted "partner-making force" phrasing. Left untouched — SEO
  meta, not display copy.
- **"Every partnership is curated to feel natural."** on
  `/for-creators` journey tile 03 — kept "Every partnership" since
  the user's instruction was scoped to the later `the partnership`
  mention. Swap later if the consistency bothers you.

## Next-step notes

- If the widened `.heroTextOverlay` (82% desktop) reads as
  too-far-right-encroaching over the video on any particular
  viewport, the cleanest lever is nudging it back toward 72–78%
  rather than re-capping `.heroTextContainer`. The container now
  relies on the overlay for its horizontal bound.
- `.missionSection` now has `overflow: hidden`. If a future visual
  (e.g. a decorative element intentionally bleeding out of the
  mission section) needs to escape, swap to `overflow: visible` and
  the clouds will drift into adjacent sections — which matches how
  the promises cloud wrapper already behaves.
