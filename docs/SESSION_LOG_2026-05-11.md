# Session Log — 2026-05-11

Container-sickness audit + first cleanup pass.

## 1. Audit

Surveyed every public page (`page.tsx` + `page.module.css`) for
container/wrapper/section naming, nesting depth, dead wrappers,
duplication, and token compliance. Catalogued findings into a
ranked optimization plan. Full diagnosis in conversation history;
the highlights that drove this session's work:

- **Homepage outlier.** Every other page uses `.page` as its root
  CSS module class; homepage used `.legacyHome` — a class name
  that confessed an unfinished refactor.
- **`--edge-pad` / `--content-max` / `--footer-max` copy-pasted**
  into 8 separate page module files (7 page roots + ContactSection
  consumer). No shared layout primitive.
- Three-layer nesting chains on several pages
  (`.featuresSection > .featuresContainer > .featuresLayout > .featuresGrid`
  etc.) — deferred to a future pass.
- Several "dead wrapper" candidates surfaced by the audit
  subagent. Verified in this session — see §3.

## 2. Cleanup pass #1 — variable unification + root rename

**New file: `apps/web/src/styles/page-shell.css`** — declares
the three shared CSS variables on `:root`. Imported once in
`apps/web/src/app/layout.tsx` alongside `generated-tokens.css`
and `typography.css`.

**Removed redundant declarations** from each `.page` rule:

- `apps/web/src/app/for-creators/page.module.css:1`
- `apps/web/src/app/for-advertisers/page.module.css:1`
- `apps/web/src/app/who-are-we/page.module.css:1`
- `apps/web/src/app/get-in-touch/page.module.css:1`
- `apps/web/src/app/snowdrift/page.module.css:1`
- `apps/web/src/app/what-is-this/page.module.css:1`
- `apps/web/src/app/signal-sheet/page.module.css:1`

Page-specific `--accent` on signal-sheet kept (it's not shared).
Page-specific `background` / `overflow` / `min-height` kept on
each page's `.page` rule — those legitimately vary.

**Homepage root renamed.** `.legacyHome` → `.page` in both
`apps/web/src/app/page.module.css:1` and the consuming
`<main className={...}>` in `apps/web/src/app/page.tsx:42`. All
8 public pages now share the same root class name.

## 3. Dead-wrapper verification — audit overcalled

The Explore-subagent audit flagged six wrappers as "dead /
pass-through". Read each one's full CSS + JSX context before
deleting. **Five out of six had real responsibilities the audit
missed** (the audit only inspected the first ~35 lines of each
module file):

| Candidate | Real purpose discovered | Verdict |
|---|---|---|
| `.morseCodeWrapper` (who-are-we) | `position: relative` + `overflow: hidden` clip for marquee `position: absolute` child | Keep |
| `.formContainer` (get-in-touch) | Width constraint shared by two conditional children (`.successMessage` AND `.contactForm`) | Keep |
| `.descriptionContent` (snowdrift) | `gap` between 4 ScrollFadeUp children; folding up would affect sibling `.descriptionTagline` | Defer (needs sibling check) |
| `.journeyRight` (for-creators) | CSS comment documents intent — groups `<ol>` + CTA as a single grid child | Keep |
| `.featuresAnimation` (creators + advertisers) | Flex center + `order: 1` reorder + sizes Lottie SVG children + responsive overrides | Keep |
| `.centeredHeadlineContainer` / `.centeredBodyContainer` (what-is-this) | Real width/margin/text-align rules; names are misleading but functional | Keep, rename later |

**Net deletions this session: zero.** The audit ran on partial
context; verification matters more than rec count.

I briefly inlined `.formContainer` into `.contactForm`, then
caught the success-state branch on read of the full JSX and
reverted.

## 4. Skipped from the plan

- Tokenizing `.heroVideoTilt`'s 32px/26px parallax multipliers
  (for-advertisers) — these are visual tuning constants, not
  spacing values; forcing them through `--gs-n-*` would be
  semantically wrong.
- Replacing homepage `background: #000000` with `var(--gs-background)`
  — the homepage actively forces `html`/`body` black via inline
  `useEffect` (`page.tsx:24-39`), so the literal black is
  intentional, not a token miss.

## Files touched

| Area | Paths |
|------|-------|
| New shared layout file | `apps/web/src/styles/page-shell.css` |
| Layout import | `apps/web/src/app/layout.tsx` |
| Page modules (vars stripped) | `apps/web/src/app/{for-creators,for-advertisers,who-are-we,get-in-touch,snowdrift,what-is-this,signal-sheet}/page.module.css` |
| Homepage root rename | `apps/web/src/app/page.module.css`, `apps/web/src/app/page.tsx` |
| Session log | `docs/SESSION_LOG_2026-05-11.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 50 referenced public assets exist |

Manual browser verification of the rename + var extraction not
performed in this session (pure refactor; classes resolve
identically, vars now sourced from `:root` instead of the local
module).

## 5. Cleanup pass #2 — misleading class renames

After reading the actual CSS for the 3-layer chains the audit
flagged (for-creators features/journey, who-are-we mission/
promises, snowdrift description), I concluded that **the chains
are structurally healthy** — each layer owns real CSS (padding,
max-width, grid, sticky positioning, distinct gaps). The audit's
"container sickness" framing applied to nesting depth was wrong;
the real issues were misleading names.

Two clean renames executed:

| Old | New | Reason |
|---|---|---|
| `.featuresGrid` (for-creators + for-advertisers) | `.featuresList` | The rule is `flex-direction: column` — it's not a grid. List-of-cards is the actual semantic. |
| `.centeredHeadlineContainer` / `.centeredBodyContainer` (what-is-this) | `.headlineBlock` / `.bodyBlock` | CSS comment already admitted "the layout is no longer centred"; rules use `text-align: left` and a left-anchored body block. |

While in `what-is-this/page.module.css` I also rewrote the
contradictory comment pair (one comment said "no longer centred",
another said "centered via `.centeredHeadlineContainer`") into a
single accurate one-liner.

## 6. Cleanup pass #3 — orphan CSS deletion (largest win)

Wrote a per-page orphan check: extract every `^\.className` rule
from `page.module.css`, extract every `styles.X` reference from
the page's `.tsx` files in the same directory, diff. Iterated
twice — the first version only inspected `page.tsx`, which would
have deleted classes used by sibling components that share the
page's CSS module. **Caught this before any damage** when
verifying who-are-we (FoundersSection.tsx + SplineEmbed.tsx both
import `./page.module.css` — modal/founder/team/cloud classes
are alive via those).

Re-ran the script against the whole page directory (`*.tsx`) for
who-are-we. Other six pages confirmed clean (only `page.tsx`
imports the module).

**Dead CSS found (verified via targeted rechecks):**

Every page had a leftover **footer/social/morse block** (~15
classes: `.footer`, `.footerTop/Nav/Morse/Social`, `.footerMark`,
`.footerWordmark{,Left,Right}`, `.footerCol{,Title,Links}`,
`.morseCode`, `.socialLink{,:hover}`, `.socialIcon`) from before
the per-page footer was replaced by the shared `<Footer />`
component. Every page also had unique page-specific dead blocks
from removed features:

- **Homepage**: `.scrollIndicator`, `.scrollArrow`, `@keyframes pulse`
- **For Creators**: footer block only
- **For Advertisers**: `.heroLogo`, `.heroLogoText`, `.pitchImageGrid`, `.pitchImageCell`, `.pitchSection:hover .pitchImageCell`, `.visualStack`, `.visualOverlay`, entire `.resonance*` section (`.resonanceSection/Content/Headline/Subhead` + `.resonanceHeadline em`)
- **Get In Touch**: `.contactCta`, `.contactCta:hover`, `.ctaArrow`, `.contactCta:hover .ctaArrow`
- **Snowdrift**: `.signupForm`/`.ctaForm` selector group, `.formLabel`, `.formRow`, `.formInput` (+ `:focus`, `::placeholder`), entire CTA section (`.ctaSection`, `.ctaContainer`, `.ctaHeadline`, `.ctaClosing`), `.ctaSection` reference inside the 768px media query
- **What Is This**: entire split-hero ecosystem (`.splitHeroWrapper/Left/Right/Image/TextContainer/Headline/Subtitle/Body`), `.staticFlicker` + `@keyframes noiseFlicker`, `.logoRow`, `.framingLogo`, the 1024px + 768px media queries that only override split-hero classes, `.barsImage`, `.alignLeft` (+ `.alignLeft .textContainer`), `.alignCenter` (+ `.alignCenter .textContainer`), `.alignRightText`, `.harmonyOrbit` (+ comment block + prefers-reduced-motion override), `.harmonyOrbitSphere`, `.sectionSubtitle`, the now-stale comment block referring to removed CSS animations
- **Who Are We**: `.heroLogoWordmark`, `.splineLoading`, `.teamHeadline`, `.modalSignature` + `.modalSignature img` + `.modalSignature img:hover`
- **Signal Sheet**: clean — no orphans found

### Line-count impact

| Page module | Before | After | Δ |
|---|---:|---:|---:|
| Homepage | 213 | 172 | -41 |
| For Creators | 975 | 839 | -136 |
| For Advertisers | 1215 | 991 | -224 |
| Who Are We | 1533 | 1350 | -183 |
| Get In Touch | 669 | 499 | -170 |
| Snowdrift | 596 | 369 | -227 |
| What Is This | 1330 | 920 | -410 |
| Signal Sheet | 838 | 838 | 0 |
| **Total** | **7369** | **5978** | **-1391** |

Plus the smaller var-extraction pass earlier this session
(~-21 lines from removed `--edge-pad`/`--content-max`/
`--footer-max` declarations, offset by +18 in the new shared
`page-shell.css`).

**Net: ~1394 lines of dead CSS removed**, ~19% reduction in page
module CSS across the public site.

## 7. What was NOT touched (and why)

- **3-layer nesting** on for-creators/who-are-we/snowdrift —
  verified each layer carries real CSS work (padding vs.
  max-width vs. grid vs. distinct gap values). Folding any layer
  would change either visual semantics or sibling layout.
  Audit's "container sickness" framing didn't survive contact
  with the actual rules.
- **Originally flagged "dead wrappers"** (`.morseCodeWrapper`,
  `.formContainer`, `.descriptionContent`, `.journeyRight`,
  `.featuresAnimation`) — see §3.
- **`.alignRight`** in what-is-this — looked orphan on a naive
  `styles.X` grep but is applied via a template-literal class
  composition (`${styles.textSection} ${styles.alignRight}` at
  `page.tsx:491`). Caught during verification; kept. Its
  siblings `.alignLeft`/`.alignCenter` had no such use and were
  deleted.
- **For-advertisers parallax magic numbers** (32px/26px) — still
  hard-coded. Same call as last session: they're tuning
  constants, not spacing tokens.
- **Homepage `#000` background** — intentional per `page.tsx`
  comment forcing html/body black.

## Files touched (full session)

| Area | Paths |
|------|-------|
| Shared layout vars | `apps/web/src/styles/page-shell.css` (new), `apps/web/src/app/layout.tsx` |
| Var declarations stripped | 7 × `page.module.css` |
| Homepage root rename | `apps/web/src/app/page.module.css`, `apps/web/src/app/page.tsx` |
| Rename `.featuresGrid` → `.featuresList` | `apps/web/src/app/for-creators/{page.module.css,page.tsx}`, `apps/web/src/app/for-advertisers/{page.module.css,page.tsx}` |
| Rename `.centered*Container` → `.{headline,body}Block` | `apps/web/src/app/what-is-this/{page.module.css,page.tsx}` |
| Orphan CSS deletion | All 7 page modules + `apps/web/src/app/page.module.css` |
| Session log | `docs/SESSION_LOG_2026-05-11.md` (this file) |

## Validation (end of session)

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 50 referenced public assets exist |

Validation re-run after every page-module edit. Pure CSS
deletions of unreferenced rules have zero runtime impact by
construction — but the user should still manually walk the site
once before pushing to catch any classname I marked orphan that's
actually applied via a less-common pattern (CSS Modules `:global`,
runtime `classList.add`, etc.). The two patterns I specifically
checked for: template-literal composition (`alignRight` survived
that check) and sibling-component CSS-module sharing (who-are-we
survived that check).

## 8. Cleanup pass #4 — final sweep

After the bulk page-module deletions, ran two follow-ups:

**ContactSection fallback dropped.**
`apps/web/src/components/ContactSection/ContactSection.module.css:2`
had `var(--edge-pad, 112px)` — the fallback existed because
`--edge-pad` was previously only declared inside each page's
`.page` rule. Now that `:root` declares it unconditionally
(pass #1), the fallback is dead code. Removed.

**Cross-page duplicate scan.** Three pages declare a
`.staticOverlay` rule (for-creators, for-advertisers,
signal-sheet) with subtle variants — opacity (0.04 vs 0.05),
SVG noise `baseFrequency` (0.85 vs 0.9) baked into the inline
data URL, plus signal-sheet's `mix-blend-mode: overlay`.
Considered extracting but the baseFrequency lives inside the
SVG payload so the dedup gains would be ~10 lines × 3 pages
for marginal benefit vs. the work of unifying the visual.
Skipped — keeping each page's tuned variant.

Cloud float keyframes (`cloudFloat1/2/3`) appear only in
who-are-we. Not duplicated.

**Components directory orphan scan.** Ran the broader orphan
check on `apps/web/src/components/` and `apps/web/src/app/*.module.css`.
False positives flagged on `BrandedGhostSignal.module.css`,
`Button.module.css`, and `HomeTypingLoop.module.css` — all use
the `styles[variant]` / `styles[propValue]` runtime access
pattern. My naive `styles\.X` grep doesn't catch bracket
access. Verified each, kept as-is. No real orphans in the
components tree.

## 9. Cleanup pass #5 — naming convention standardized

Established a per-role suffix convention across all page modules:

| Suffix | Role |
|---|---|
| `*Section` | The semantic band (one per visual section). |
| `*Container` | Content well — width-constrained via `max-width: var(--content-max)` + `margin-inline: auto`. |
| `*Content` | Inner content grouping (flex/stack) **without** a width constraint. |
| `*Layout` / `*Grid` | Multi-column grid or specific layout shape. |
| `*Wrapper` | Earns its keep with `overflow` / `transform` / `clip-path` / position isolation. |

Surveyed every rule with `max-width: var(--content-max)` across
the public site, identified four mismatches where the rule did
content-well duty but used the `*Content` suffix, and renamed
each in CSS + the single JSX call site:

| Page | Before | After |
|---|---|---|
| get-in-touch | `.contactContent` | `.contactContainer` |
| for-creators | `.closingContent` | `.closingContainer` |
| who-are-we | `.missionContent` | `.missionContainer` |
| signal-sheet | `.heroContent` | `.heroContainer` |
| ContactSection | `.contactContent` | `.contactContainer` |

Deliberately left as-is:
- Other pages' `.heroContent` (snowdrift, for-creators, for-advertisers, who-are-we) — these are inner flex-column groupings without `max-width`, so `*Content` is the right suffix per the new convention.
- `.foundersGrid` (who-are-we), `.categoryList` (signal-sheet), `.journeyHeader` (for-creators) — happen to be width-constrained but their names describe more specific roles (grid / list / section header) that take precedence.

## 10. AGENTS.md — orphan-detection trap documented

Added a short "Orphan CSS Detection (Cleanup Trap)" section to
`AGENTS.md` covering the two patterns that would have silently
deleted alive classes during this session: (a) sibling components
that share the page's CSS module (`who-are-we/FoundersSection.tsx`
+ `SplineEmbed.tsx`), and (b) dynamic bracket access
(`styles[variant]`, `styles[seg.className]`) used in
`Button`/`BrandedGhostSignal`/`HomeTypingLoop`.

Documented the two requirements an automated cleanup must
satisfy: union references across all `*.tsx` in the module's
directory, and match both `styles.X` and `styles[` access
patterns.

## 11. Cleanup pass #6 — JSX layout primitives (proof of concept)

Created `apps/web/src/components/layout/` with two primitives:

- **`<Section>`** — semantic `<section>` wrapper. Forwards refs so
  parents can attach scroll triggers / IntersectionObservers.
  No base CSS (page sections vary too much in
  background/padding/clip-path for shared defaults to be safe).
- **`<Container>`** — content-well wrapper. Its own
  `Container.module.css` provides the universal base
  (`max-width: var(--content-max); margin-inline: auto`). Page
  CSS no longer has to redeclare those two lines on every
  `*Container` rule.

Naming convention now collapses: page CSS classes drop the
`Container` suffix because the JSX type carries the role.
Old: `<div className={styles.featuresContainer}>` where the
rule has max-width + margin + layout. New:
`<Container className={styles.features}>` where the rule has
only the layout. The role-vs-styling split is finally clean.

**Migrated as proof of concept** (the two surfaces with the
clearest mapping):

1. `apps/web/src/app/get-in-touch/page.tsx` — `.contactContainer`
   → `.contact`, max-width + margin-inline dropped. `<section>` →
   `<Section>` on both bands. Form section kept its custom
   `.formContainer` (uses a narrower 640 max-width, not
   `--content-max`) — `<Container>` is only for the standard
   width well.
2. `apps/web/src/components/ContactSection/ContactSection.tsx`
   — `.contactContainer` → `.contact`, max-width + margin-inline
   dropped. Bonus: the rule used a raw
   `calc(var(--gs-n-1696, 1696) * var(--gs-px))` literal
   instead of `var(--content-max)` — switching to `<Container>`
   normalizes that.

Validation: typecheck, lint, assets:audit all pass after each
migration.

## 12. Cleanup pass #7 — primitive rollout to all public pages

After get-in-touch verified visually clean in the dev server,
rolled out `<Section>` and `<Container>` to every other public
surface:

**All `<section>` → `<Section>`** (zero raw `<section>` elements
remain anywhere under `apps/web/src/app/{page.tsx,
for-creators, for-advertisers, who-are-we, get-in-touch,
signal-sheet, snowdrift, what-is-this}` + `components/ContactSection`
+ `who-are-we/FoundersSection`). Every band on the public site
now flows through the typed primitive.

**Content-well migrations — `<div>` → `<Container>`**, with the
CSS-rule rename (drop `Container` suffix where it doesn't
conflict with the section class) and removal of the
now-redundant `max-width: var(--content-max); margin-inline: auto`
lines:

| Page | Class rename | Notes |
|---|---|---|
| what-is-this | `.platformsContainer` → `.platforms` | |
| for-creators | `.featuresContainer` → `.features` | |
| for-creators | `.closingContainer` → `.closing` | |
| for-creators | `.journeyHeader` (kept) | semantic-role name takes precedence |
| for-advertisers | `.featuresContainer` → `.features` | |
| for-advertisers | `.businessContainer` → `.business` | including 2 media-query references |
| who-are-we | `.missionContainer` → `.mission` | including 1 media-query reference |
| who-are-we | `.promisesContainer` → `.promises` | |
| who-are-we (FoundersSection) | `.teamContainer` → `.team` | |
| who-are-we (FoundersSection) | `.foundersGrid` (kept) | semantic-role name; the `max-width` line was redundant inside `.team` already |
| signal-sheet | `.heroContainer` (kept) | would conflict with `.hero` section class |
| signal-sheet | `.sectionContainer` (kept) | would conflict with `.section` band class |
| signal-sheet | `.categoryList` (no Container migration) | `<ul>` semantic — kept the `max-width` line since no `<Container>` wraps it |
| signal-sheet | `.section` (kept on the categories.map band) | |

**Pages with no Container migrations:**

- snowdrift — its `.signupContainer` and `.descriptionContainer`
  use custom max-widths (640 / 900), not `var(--content-max)`.
  Kept as plain `<div>`. Section migration still applied.
- homepage — `.heroSection` had no inner content-well using
  `var(--content-max)`. Section migration only.

**Net code shape after pass #7:**

- Page-specific `*Container` CSS rules dropped 2 lines each
  (max-width + margin-inline) — those lines now live exclusively
  in `Container.module.css`.
- JSX gained `<Section>` and `<Container>` imports + slightly
  longer tag names; net diff `+155 / -127` across 18 files.
- The role-vs-styling split is now structurally enforced: any
  new section without `<Section>` stands out, and any new
  content well that doesn't go through `<Container>` either
  has a custom max-width or is a divergence.

Validation: typecheck, lint, assets:audit all pass after each
page's migration.

## 13. for-creators — top hero logos removed

User requested the three small GhostSignal lettermarks above the
"Your podcast is / Cultural architecture / You are building the
future" headline be removed without letting the headline shift
up.

The logo row sat in a `.heroContent` flex-column with `gap:
var(--gs-n-96)`, so a clean delete would have pulled the
headline up by `logo-height (clamp 20–30px) + 96px`. Replaced
the whole `<ScrollFadeUp><div .heroLogos>...</div></ScrollFadeUp>`
block (lines 215–239) with a single invisible spacer:

```tsx
<div className={styles.heroLogosSpacer} aria-hidden="true" />
```

…and added the matching CSS rule next to `.heroLogos`:

```css
.heroLogosSpacer {
  height: clamp(20px, 2.5vw, 30px);
}
```

The flex-column gap then preserves the headline's exact original
position. `.heroLogos` itself is kept — still used by the second
(bottom) logos row at the foot of the hero.

## 14. Admin tree audit (no-op outcome)

Pointed an Explore agent at `apps/web/src/app/admin/**` +
`apps/web/src/components/admin/**` with explicit guardrails
against destructive recommendations (AGENTS.md orphan-detection
trap section was required reading before flagging anything).

**Findings:**
- Admin is hermetically separated from public (zero cross-tree
  imports except the intentional `RQResultsGraph` reuse).
- Admin has its own complete token system (`--admin-*`) and
  shared component library (`components/admin/`: AdminShell,
  Button, Badge, Modal, DataTable, etc.).
- ~95% token-compliant; only 2 hard-coded pixel values
  (`DataTable.module.css:26`, `members.module.css:50`), both
  intentional micro-spacing below the token scale.
- No confidently callable orphans — design-tasks classes that
  looked dead are accessed via `styles[\`status_${task.status}\`]`
  (the bracket-access trap from AGENTS.md).

**Real opportunity ranked highest:** extract a shared
`<CommentThread>` from members + TaskDetailPanel.

**On closer reading: opportunity withdrawn.** The two
implementations share class-name patterns but are genuinely
different features. Members is newest-first, simple, no edit,
no reactions, dropdown author selection. TaskDetailPanel is
oldest-first with scroll-to-bottom, avatars, edit (own only),
delete (own only), emoji reactions, founder picker. A shared
component would have to either strip features (destructive),
become a 10-prop super-component, or save ~15 lines of LCD
shell while both consumers still implement most logic
themselves. None of those land in a good place.

**Net: admin is in good shape; no action taken.**

## 15a. AGENTS.md — load-bearing additions for future agents

Two new sections added to `AGENTS.md` so future agents discover
today's architecture from the canonical runbook instead of by
reading source:

- **"Token Namespaces (Four-Surface Map)"** as a subsection at
  the top of "Design Token System". Documents the four parallel
  namespaces (`--gs-*`, `--admin-*`, `--rq-*`, `--ds-*`), what
  each is for, and that they're intentionally separate. Makes
  explicit that the rest of the "Design Token System" section
  applies to the `--gs-*` surface only.
- **"Layout Primitives & Section Conventions (Mandatory, public
  site)"** as a new top-level section between the token system
  and the motion library. Documents `<Section>` and
  `<Container>` (path, when to use each, the canonical
  structure), the class-name suffix convention (`*Section` /
  bare-name well / `*Content` / `*Layout` / `*Wrapper`), when
  to keep the `Container` suffix despite the convention (name
  conflicts), when `<Container>` is the wrong choice (custom
  max-widths — snowdrift / get-in-touch form), the shared
  `:root` page-shell vars (`--edge-pad` / `--content-max` /
  `--footer-max`) with the instruction not to redeclare them
  in page modules, and a note that admin uses `<AdminShell>`
  instead.

`Token Discipline (Stylelint)` + `Orphan CSS Detection
(Cleanup Trap)` sections were already in place from earlier
this session.

## 15. Cleanup pass #8 — Stylelint token discipline rule

Installed `stylelint` as a dev dep and added a focused rule:
`declaration-property-unit-disallowed-list` with `px` forbidden
on spacing-family properties (`padding*`, `margin*`, `gap`,
`row-gap`, `column-gap`, `top`/`right`/`bottom`/`left`/`inset*`).
Other properties (`width`, `height`, `font-size`, `border`,
etc.) remain unrestricted — px is legitimate there.

**Scope: public `--gs-*` surface only.** `.stylelintignore`
excludes four self-contained design-system surfaces:

- `src/app/admin/` + `src/components/admin/` (uses `--admin-space-*`)
- `src/app/rq-quiz/` + `src/components/rq/` (uses `--rq-*`)
- `src/app/design-system/` (uses `--ds-*` for the showcase page)
- `src/styles/generated-tokens.css` (generated, not hand-edited)

**Initial run: 302 violations across 11 files.** After the
ignore-file expansion (RQ + design-system surfaces have their
own token namespaces and shouldn't be forced through `--gs-*`),
**30 real violations across 7 files remained.**

Triaged + fixed:

| Category | Count | Resolution |
|---|---|---|
| Homepage `var(--gs-px, 1px)` fallback pattern | 13 | Dropped the `, 1px` fallback (the var is unconditionally declared in `:root`, fallback is dead). |
| Homepage admin button drift (top, right, gap, padding) | 6 | Tokenized — `top: 20px` → `top: calc(var(--gs-n-20) * var(--gs-px))`, etc. |
| Clip-path-paired `margin-top: -60px` (creators, advertisers, get-in-touch features section) | 3 | Suppressed with explanatory comments — paired with the `60px` peak in the `clip-path: polygon(...)` value; the two must move together. |
| `.matterText::after { inset: -10px -20px }` (creators) | 2 | Tokenized using the negative-multiplier pattern `calc(var(--gs-n-10) * var(--gs-px) * -1)`. |
| what-is-this position math (`right`, `left`) mixing `%` + `vh` + raw px | 2 | Tokenized just the px terms inside the `calc(50% + 9vh + ...)` expressions. |
| what-is-this `margin-top: 100px` + `margin: calc(var-200 - 75px)` | 2 | Tokenized to `--gs-n-100` and `(--gs-n-200 - --gs-n-75)`. |
| ContactSection `var(--edge-pad, 28px)` fallback in 768px media query | 1 | Removed fallback (same reason as homepage's `1px` fallbacks — the var is unconditional now). |
| Snowdrift sr-only `margin: -1px` | 1 | Suppressed with comment — canonical screen-reader-only pattern, the `-1px` is structural. |

**Wiring:**

- `apps/web/package.json`: new `lint:css` npm script
- `apps/web/.stylelintrc.json`: the rule config
- `apps/web/.stylelintignore`: scope-exclusion list with reasons
- `apps/web/.gitignore`: ignore the `.stylelint-report.json` artifact
- `AGENTS.md`: added `npm run lint:css` to the pre-ship checklist + a new "Token Discipline (Stylelint)" section documenting scope, excluded directories, and how to suppress legitimate exceptions

Validation: `npm run lint`, `npm run typecheck`, `npm run lint:css`,
`npm run assets:audit` all pass.

**Effect:** the token discipline now compounds forever. Every
future spacing value on the public site is forced through the
calc pattern or has to be explicitly suppressed with a written
reason.

## Open follow-ups / next-step notes

1. **Manual browser re-walk after the full rollout.** Every
   page now uses the primitives; even though each was validated
   in lint+typecheck and the rule changes are mechanically
   safe, a full click-through (especially the bands with
   complex inner grids: for-creators features/journey,
   who-are-we mission/promises, for-advertisers business) is
   worth doing before pushing.

2. **Stylelint rule: forbid hard-coded px/rem outside the calc
   pattern** — would catch future token-system drift
   automatically. Separate tooling concern.

3. **Admin pages audit** — entire `apps/web/src/app/admin/**`
   tree was excluded from this session. Likely has similar
   orphan-CSS / container-sickness / naming-inconsistency
   issues. Untouched territory.

4. **Potential `<Container>` ergonomic tweak.** A few content
   wells need a custom `max-width` that isn't `--content-max`
   (snowdrift's `.signupContainer` / `.descriptionContainer`,
   get-in-touch's `.formContainer`). Currently those stay as
   plain `<div>`. If we want them under `<Container>` too,
   either: (a) accept a `maxWidth` prop on the component, or
   (b) extract a CSS custom property `--container-max` that
   `<Container>` reads, defaulting to `--content-max`, so the
   consumer can override it inline or via class. Not urgent.
