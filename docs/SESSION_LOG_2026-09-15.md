# Session log — 2026-09-15

## Outcomes

### Holly Mackle — first creative / brand proposal

- First GhostSignal creative-services proposal beyond advertising (Holly Mackle / Unseriously).
- Jeremy’s brief saved verbatim; deck built and refined for Thursday team review → present to Holly.
- **Investment:** $4,850 total (not phase-split). **Timeline:** ~2 weeks suggested.
- Deck: **6 slides @ 1920×1080** — Cover, Opportunity, The Work (overview), Timeline, Scope (4 tall columns + price bar), Next Steps (no price).
- Internal noindex web viewer at `/proposals/holly-mackle` (full-stage 16:9, left rail, cloudmark, “Holly Mackle Proposal V1”).

### Local network (gaming lag)

- Root cause: Wi‑Fi stuck on congested **2.4 GHz ch 11 (~85% utilization)** despite FRITZ!Box 5 GHz available.
- Fix scripts under `scripts/` set **Prefer 5GHz**; machine now on **5 GHz ch 100** with higher throughput / more stable link.
- Antenna orientation tweaks; Rssi still ~−78 from this desk — placement/Ethernet for further gains.

## Files

### Proposal / viewer

- `docs/client-work/holly-mackle-brand/` — brief, README, PPTX, build script, LibreOffice-rendered `slides-real/`
- `apps/web/src/app/proposals/holly-mackle/` — page + layout (noindex) + CSS
- `apps/web/public/images/proposals/holly-mackle/slide-01.png` … `slide-06.png`
- `apps/web/public/images/brand/cloudmark-white.png`, `cloudmark-black.png`

### Wi‑Fi fix (machine helper)

- `scripts/fix-wifi-prefer-5ghz.bat`
- `scripts/fix-wifi-prefer-5ghz.ps1`
- `scripts/prefer-5ghz.reg`

## Validation

- PPTX rebuilt at 1920×1080; LibreOffice → PDF → PNG for slides 1–6; full Jeremy copy verified on scope slide (incl. “consistency across all of your current platforms”).
- `assets:audit` OK for public refs; Stylelint clean for proposal CSS.
- Local viewer: `http://localhost:3001/proposals/holly-mackle` (port 3000 was occupied).
- Wi‑Fi: `netsh wlan show interfaces` confirmed **Band: 5 GHz** after fix.

## Open / next

- Thursday: lock timeline, website depth (hub MVP vs fuller), payment/start terms; any copy tweaks before Holly.
- Share production link only after team sign-off (page is noindex but not yet a deliberate public share).
- Optional: FRITZ!Box 5 GHz channel (e.g. 36/40) or Ethernet if desk signal stays ~−78.
