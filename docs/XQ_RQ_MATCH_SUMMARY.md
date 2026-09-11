# XQ + RQ match summary display

Canonical product rule for how GhostSignal shows XQ and RQ together.
**This is matchmaking IP — preserve prior work.**

## Rule

| Context | What to show |
|---------|----------------|
| **Both XQ and RQ filled** (Studio paired summary) | RQ tile title = `{ArchetypeNoun} {DirectionAdjective}` e.g. **Architect Radiant**. Keep RQ code chip. |
| **RQ only** | Three-word RQ name (unchanged). |
| **RQ detail** (modal / RqProfileCard / quiz reveal) | Three-word call sign **plus** the three axis analyses. |
| **XQ tile / XQ detail** | Unchanged (`The Architect`, tagline, buckets). |

Strip a leading `"The "` from the XQ display name **only** when building the combo title. Do not rename archetypes in `ARCHETYPES`.

## Data that must never be removed

- `computeRQ` three-word generation (`WORDS` pools in `lib/rq/constants.ts`)
- `rq_submissions.rq_name` (and Google Sheet “RQ Name”)
- Axis `DESCRIPTIONS` prose
- XQ scoring / archetypes / match axis vectors

The direction adjective is a **display overlay**, looked up from the stored three-word name. It is not a replacement for the three-word definition.

## Adjective source

Jeremy’s sheet (committed as `apps/web/src/lib/rq/data/rq-direction-adjectives.csv`):

- 216 rows = full orientation × intensity grid
- Lookup key: `Original_Three_Word_Name` → `New_Unique_Adjective`
- Generated map: `apps/web/src/lib/rq/data/rq-direction-adjectives.ts`
- Helper: `apps/web/src/lib/rq/direction-adjective.ts`

Sheet mid/high labels (4–5 / 6–9) differ from live bands (4–6 / 7–10). Looking up by the **stored three-word name** avoids remapping scores and keeps existing completes correct.

## Surfaces (v1)

**Changed:** `/studio/profile` `RqTile`, `/studio/results` `ResultTiles` RQ headline — only when XQ is also present.

**Unchanged in v1:** admin CRM, marketplace, roster, world, public RQ quiz results hero, match scoring.

## Later phases

Reuse `formatXqRqSummaryTitle` for roster / admin / emails when ready. Do not invent a second lookup path.
