# ART19 — email draft to Bill (Support): scheduled daily download export

Status: **DRAFT — ready to send** once we have Bill's email + confirm sender.
Context: unblocks Phase D of the ART19 integration ("Daily / date-ranged
listens"). Our side is fully built and waiting — `art19_listens_daily` table +
`/api/admin/art19/listens?range=30d` endpoint + the "Listens · last 30d" KPI
tile on `/admin/art19` (currently reads "pending ART19 metrics access", lights
up automatically once rows land). The API only exposes lifetime `listen_count`;
the daily/rolling data comes from ART19's scheduled S3 export. Bill said it was
"in hand, will follow up" on 2026-06-01; as of 2026-08-07 `art19_listens_daily`
still has 0 rows, so it never got wired up.

Framed around Mike's ask: a **last-30-days** listen figure for the **whole
network combined (all sources)** and **per individual show**.

Open before sending: (1) Bill's email address, (2) sender / sign-off name,
(3) whether to fold in the second ART19 question (active campaigns show
impressions but `current_spend = 0` — billing/reconciliation lag).

---

**Subject:** GHOSTSignal — following up on the scheduled daily download export

Hi Bill,

Thanks again for getting our API credential set up back in June — the
integration's been working great for lifetime download totals across our
network.

I wanted to follow up on the **scheduled daily download export** you mentioned
was in hand. We're building listenership reporting on our internal dashboard,
and the main thing Mike's after is **a "last 30 days" listen figure** — the API
gives us lifetime totals, but not a rolling window, which I understand is what
the S3 export is for.

Specifically, we'd love to show:

- **Network total** — total downloads over the last 30 days across the **whole
  network — all shows, all sources/platforms combined** (one headline number).
- **Per show** — the same last-30-days total, broken out for **each individual
  show**.

The cleanest way to power both (and keep them current) is a **daily per-show
download feed** — one row per show per day — which we roll up into the 30-day
window on our end. So if the export gives us daily download counts per show,
we're set.

Could you help us get that set up for our network?

- **Network:** GHOSTSignal — ART19 network ID `d40f1918-a60d-4eac-b1e7-55b357b3ce18`
- **Data:** daily downloads per show, IAB v2.2-certified.

A few logistics questions so I can prepare our side to receive it:

1. **Delivery** — how do you typically deliver these? Do you write to an S3
   bucket on your side that you'd give us read credentials for, or should we
   provision one for you to deliver into? Whatever you need from us, just say.
2. **Format & schema** — file format (CSV/JSON, gzipped?), the columns, the
   file path/naming convention, and what timezone the "date" reflects.
3. **Cadence** — daily is perfect; roughly what time does the prior day's file
   land?
4. **Backfill** — can you seed some history (say the last 12–24 months) so our
   30-day view and trends have context from day one?

Happy to hop on a quick call if that's easier. Appreciate the help — this is
the last piece to light up our reporting.

Best,
[Your name]
GHOSTSignal
