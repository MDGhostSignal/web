# Invitation roster assets

Per-client images for the "Who we work with" carousel on `/invitation`
(`src/app/invitation/RosterCarousel.tsx`).

Drop two files per client, then set `logo` + `banner` on that client's
entry in `RosterCarousel.tsx`.

| Client                        | slug                  | logo                        | banner                    |
| ----------------------------- | --------------------- | --------------------------- | ------------------------- |
| The Biblical Mind             | `biblical-mind`       | `biblical-mind-logo.png`    | `biblical-mind-bg.jpg`    |
| Tonja's Toffee                | `tonjas-toffee`       | `tonjas-toffee-logo.png`    | `tonjas-toffee-bg.jpg`    |
| Unseriously with Holly Mackle | `unseriously`         | `unseriously-logo.png`      | `unseriously-bg.jpg`      |
| Etkin Designs                 | `etkin-designs`       | `etkin-designs-logo.png`    | `etkin-designs-bg.jpg`    |
| Sunshine In My Nest           | `sunshine-in-my-nest` | `sunshine-in-my-nest-logo.png` | `sunshine-in-my-nest-bg.jpg` |
| MatchGrant                    | `matchgrant`          | `matchgrant-logo.png`       | `matchgrant-bg.jpg`       |
| The Pivot                     | `the-pivot`           | `the-pivot-logo.png`        | `the-pivot-bg.jpg`        |
| Tektones                      | `tektones`            | `tektones-logo.png`         | `tektones-bg.jpg`         |
| Rabbit Room                   | `rabbit-room`         | `rabbit-room-logo.png`      | `rabbit-room-bg.jpg`      |
| Readmio                       | `readmio`             | `readmio-logo.png`          | `readmio-bg.jpg`          |
| The Habit                     | `the-habit`           | `the-habit-logo.png`        | `the-habit-bg.jpg`        |
| The Hutchmoot Podcast         | `hutchmoot`           | `hutchmoot-logo.png`        | `hutchmoot-bg.jpg`        |
| Triptych Conversations        | `triptych`            | `triptych-logo.png`         | `triptych-bg.jpg`         |

- **logo** — square-ish, transparent PNG preferred. Shows in the card's
  56px disc (rendered `contain`, so it won't be cropped).
- **banner** — landscape image, ~2:1. Fills the card's top strip and the
  taller popup header; the lower edge fades into the card surface.

Extensions are only a suggestion — set the real path (any extension) on
the client entry. Until both are set, the card falls back to a monogram
letter + a tinted tone wash, so a missing asset never breaks the page.
