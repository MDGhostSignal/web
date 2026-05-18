# Session Log — 2026-05-18 (what-is-this copy pass)

Late-day copy refresh on `/what-is-this`. Small JSX + CSS, no
architecture changes.

## 1. Harmony section — body rewrite

Replaced the three body paragraphs with new copy that opens with
the framing line and lands on the Values-Based-Advertising thesis:

- Index 0: "Most advertising is built on reach, not resonance."
- Index 1: "But what if advertising could make harmony?" (echoes
  the section headline)
- Index 2: One longer paragraph combining the prior three lines
  about Values-Based Advertising / The Signal / brand+creator
  reciprocity / world-making.

The bodyCallout question + "Find my match" button at the end stay
unchanged.

## 2. Values section — list collapsed, callout added

- Intro line "And when advertising partnerships share soul?" →
  "Values-Based Advertising means:".
- The intro + three outcome lines (creators / brands / audiences)
  were previously four separate `ScrollFadeUp` paragraphs with a
  24 px gap between them from the parent flex column. Collapsed
  into **one** `ScrollFadeUp` containing a single `<p>` with
  `<br />` separators — they now stack flush with only the
  paragraph's natural line-height between rows. `margin: 0` on
  `.sectionBody` keeps the four lines visually contiguous.
- Closing line extended: "Want to take a deeper dive into the
  science?" → "Want to take a deeper dive into the science? Read
  our white paper here." and reclassed from `.sectionBody` to
  `.bodyCallout` so it matches the harmony-section callout
  treatment (soft amber-tinted background, 3 px accent left
  border, brighter copy). The "Read our white paper" button at
  index 5 stays — the "here" in the callout reads as "click the
  button below".

## 3. Final CTA section — Follow Your Signal

The bottom section used to be a one-line invitation to download
the white paper. Replaced with a persona-split CTA so visitors
self-select before getting to the dedicated pages.

- Heading: "Access our white paper and read about how
  GHOSTSignal can help you make the world." → **"Follow Your
  Signal."**.
- Single `Read the White Paper` external `<a>` → **two internal
  `<Link>`s** side-by-side:
  - **I am a Creator** → `/for-creators`
  - **I am an Advertiser** → `/for-advertisers`
- Both reuse the existing `.whitepaperButton` chrome (yellow
  pill, dark text) for visual consistency with the upper CTA.
- New `.whitepaperButtonRow` wrapper — flex row, centered,
  `flex-wrap: wrap` so the pair stacks vertically on narrow
  viewports instead of overflowing the centered column.
- The white-paper download moves to being exclusively the inline
  button in the values-section callout — single canonical CTA for
  that document now.

## Files touched

| Area | Paths |
|------|-------|
| Harmony copy + Values list + callout + Follow-Your-Signal | `apps/web/src/app/what-is-this/page.tsx`, `apps/web/src/app/what-is-this/page.module.css` |
| Session log | `docs/SESSION_LOG_2026-05-18_copy-pass.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run lint:css` | ✅ pass |
