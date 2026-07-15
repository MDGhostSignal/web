# Session Log — 2026-07-15

Fixed the **contract renewal reminder pipeline**, which was silently
dead: no member had a captured signed date, so the `contract_expiring`
alert could never fire. Root cause was a field-name mismatch with the
eSignatures API, plus a propagation gap when a member link is confirmed
after a contract syncs. Also changed contract-alert **routing** to
always reach Mike + Jack, and hardened the digest against
**double-sends**.

5 files changed. Diagnosis was heavy on live-data probing (Supabase
read-only MCP + a direct eSignatures API probe).

## 1 · Root cause — eSignatures returns `finalized_at`, not `signed_at`

The upsert (`esignatures-webhook.ts`) read `contract.signed_at`, which
the API never sends. A live probe of the 4 signed contracts showed the
completion timestamp comes back as **`finalized_at`**; signer objects
carry no `signed_at`/`status` on read, and membership agreements have
no `expires_at` (so term correctly falls back to the 12-month default).

Result across 266 members before the fix: `contract_signed_at` null for
**all** of them, zero `contract_expiring` alerts ever emitted.

## 2 · Capture fix

- `esignatures-types.ts`: added `finalized_at` to `EsignaturesContract`.
- `esignatures-webhook.ts`: `signed_at` now resolves to
  `signed_at ?? finalized_at ?? latestSignerSignedAt(signers)`, so
  webhooks and resyncs populate the date automatically. Added the
  `latestSignerSignedAt` helper as a belt-and-braces fallback for
  signed-event payloads that carry per-signer timestamps.

## 3 · Propagation gap — link-after-sync

`syncContractDatesToMember` only ran inside `upsertContractFromApi`
(webhook / create / resync). A contract synced **before** being linked
to a member — exactly the state the 4 historical contracts were in —
never propagated its date when the link was later confirmed.

- Exported `syncContractDatesToMember`.
- `contracts/[id]/route.ts` PATCH now calls it when a member link is
  confirmed on an already-signed contract (guarded, only-when-null).

## 4 · Backfill (data)

Pulled real `finalized_at` from the live API and wrote it through the
service-role REST path: 4 contracts got `signed_at`; the 3 linked
members got `contract_signed_at`. All three are now **armed** — none
fire today (all signed in 2026, renew in 2027; each fires 30 days
prior).

| Member | Signed | Renews |
|---|---|---|
| Holly Mackle | 2026-02-27 | 2027-02-27 |
| James Spencer | 2026-05-19 | 2027-05-19 |
| Dru & Mike (Biblical Mind) | 2026-05-27 | 2027-05-27 |

The LLC Operating Agreement (2025-12-22) is intentionally left unlinked
— it's the company's own agreement, not a membership renewal.

## 5 · Routing — contract alerts always go to Mike + Jack

- `emails.ts`: added `CONTRACT_ALERT_OWNERS = ["Mike Sense",
  "Jack W Harding"]` (names fixed in code; addresses still resolve from
  `ALERT_EMAIL_<SLUG>`).
- `digest/route.ts`: `contract_expiring` alerts bypass owner-based
  grouping and land in both those buckets, and nowhere else. All other
  kinds route by owner as before.

## 6 · Double-send hardening

Confirmed the DB already prevents duplicate alert rows (partial unique
indexes `crm_alerts_open_member_unique` / `_open_task_unique`), and the
sync job is idempotent. Closed the one remaining vector — two owner
buckets resolving to the same inbox (e.g. `ALERT_EMAIL_JACK_W_HARDING`
unset → collapses with the fallback bucket):

- `digest/route.ts`: collapse buckets by **resolved recipient address**
  and dedupe alerts by id before sending. Each inbox now receives
  exactly one email per run, each alert listed once. Verified by
  simulation across prod + two misconfig cases.

## 7 · Deliverability tests

Sent live Resend test emails (HTTP 200) to confirm the sending path:
one to hello@martindrexler.com, one to hello@martindrexler.com +
jack@ghostsignal.cloud. Isolated one-off sends — did **not** touch the
real digest route or the 217 open alerts.

## 8 · Paused contact-cold alerts

At the team's request, `contact_cold` detection is paused (kept, not
removed). Added `contactColdAlertsEnabled()` in `alerts.ts` — reads
`ALERTS_CONTACT_COLD_ENABLED`, defaults **off** — and gated the one
detection branch in `detectAlertsForMember` behind it. The logic is
left fully intact; flip the env var to `true` to resume, no redeploy.

`alerts.ts:203` is the only place the kind is emitted (verified), so
the gate stops it entirely. On deploy, the hourly sync's reconcile
resolves all 217 currently-open contact_cold alerts on its next run —
clearing them from the bell, dashboard, and digest. Re-enabling
re-creates them for members still cold.

Jack confirmed he received the contract-renewal test email, so
deliverability to his address is verified. Note the test was sent
directly to jack@ghostsignal.cloud — it does not prove
`ALERT_EMAIL_JACK_W_HARDING` is set in Vercel (still a follow-up).

## 9 · Admin sidebar — collapse flash fix + hover-to-expand

Jack reported the collapsible sidebar sometimes showing a wide rail
with icons only (expanded width, no labels) after clicking straight to
a page.

Root cause: on a hard nav with a stored *collapsed* preference, SSR
paints the sidebar expanded, then hydration snaps it to collapsed. The
width had a 200ms transition but labels hide instantly (`display:none`)
— so for ~200ms you saw a wide icon-only rail.

- **Flash fix**: gated all sidebar/content transitions behind a
  `data-ready` flag (flipped one `requestAnimationFrame` after mount).
  The initial expanded → collapsed snap is now instant + atomic; later
  toggles/hovers still animate. Touches AdminShell + both CSS modules.
- **Hover-to-expand**: added a transient `peek` state — when collapsed,
  hovering the expand button reveals the full rail. It *overlays* the
  content (rail width decoupled from the content-reflow var + a
  drop-shadow) rather than shoving it, and does not change the saved
  preference. Peek starts on button hover, ends when the pointer leaves
  the sidebar (not the button — leaving on button-exit would snap shut
  as you reach for a nav item). Strict button-only is a one-liner if
  wanted.

Files: `AdminShell.tsx`, `AdminSidebar.tsx`, `AdminShell.module.css`,
`AdminSidebar.module.css`. Typecheck clean, dev-compiled; not clicked
through (admin is auth-gated) — pending an eyeball from the team.

## 10 · Campaign-ending alerts (email + in-app)

New alert kind for ART19 campaigns: when a campaign reaches **97% of its
run time**, notify Jack + Mike. Built on the existing crm_alerts system
(bell + dashboard) plus a dedicated one-time email.

**Why run-time, not impressions**: campaigns routinely over-deliver
impressions (e.g. 20.0M delivered on a 20.0M goal, some >130%), so a
volume threshold would misfire. The trigger is `run_pct ∈ [97, 100)` —
still running, in the final stretch. The upper bound is load-bearing:
without it a first run would fire on all 13 already-concluded campaigns
(confirmed by query). Excludes `archived_draft`.

**Delivery model** — two channels, deliberately split:
- *In-app*: a `campaign_ending` crm_alerts row (subject = campaign),
  shown in the bell + `/admin/alerts` with a new filter pill, links to
  `/admin/art19`. Rendered entirely from `reason_json.campaign` (a
  captured snapshot) so no new PostgREST embed was needed.
- *Email (fire-once)*: sent to Jack + Mike the moment the alert row is
  first inserted — NOT re-sent by the daily digest. The open-alert row
  is the dedup guard (partial unique index on `(kind, campaign_id)`).

**Email hierarchy** (as requested, most→least significant): run-time
elapsed + days left + window → impressions delivered vs goal (+ % of
goal) → delivery-vs-run-time pacing + fill rate → CPM + est. gross
value → ad units + type/source. Header names the campaign and states
"reached X% of its run time."

**Files**
- `docs/CRM_ALERTS_CAMPAIGN_MIGRATION.sql` — adds `campaign_id` subject,
  `campaign_ending` kind, relaxed subject-check, fire-once unique index.
  Must be applied manually (Supabase read-only via MCP this session).
- `lib/campaign-alerts.ts` — detection, snapshot, email builder,
  recipient resolution (Jack + Mike from ALERT_EMAIL_* env, deduped).
- `api/admin/campaign-alerts/sync/route.ts` — detect → insert → email
  once → reconcile (resolves concluded ones). Bearer CRON_SECRET or
  admin cookie.
- `.github/workflows/campaign-alerts.yml` — hourly cron (`15 * * * *`).
- `lib/alerts.ts` — new kind, label, `campaign_id`, `CampaignAlertSnapshot`.
- `proxy.ts` — allowlist the cron endpoint.
- `AlertsBell.tsx`, `admin/alerts/page.tsx` — render the new kind
  (subject, age label, href, filter pill); "Re-scan now" also kicks the
  campaign sync.
- CRM `alerts/sync` (`&campaign_id=is.null`) + `alerts/digest`
  (`&kind=neq.campaign_ending`) — so the member/task jobs never touch
  campaign alerts.

**Verification**: typecheck clean; dev-compiled; detector confirmed
against live data (0 qualify now, 5 running at 46.3%, 13 would falsely
fire without the upper guard); test email of the exact layout delivered
to Martin + Jack (Resend 200). DB-write path is gated on the migration.

**Prod prerequisites** (not yet done):
1. Apply `docs/CRM_ALERTS_CAMPAIGN_MIGRATION.sql` in Supabase.
2. Add GitHub secret `CAMPAIGN_ALERTS_SYNC_URL`
   (= https://www.ghostsignal.cloud/api/admin/campaign-alerts/sync).
3. Confirm `ALERT_EMAIL_JACK_W_HARDING` + `ALERT_EMAIL_MIKE_SENSE` set
   in Vercel.

## Follow-ups

- **Verify `ALERT_EMAIL_JACK_W_HARDING` is set in Vercel prod** — else
  Jack's contract copy falls back to the shared inbox (still no double,
  just not his address).
- Two of the three linked members have no `owner`; non-contract alerts
  for them route to the fallback inbox.
- Known cosmetic bug (not fixed): the digest "Open →" link for
  contract alerts points to `/admin/contacts`, not the contract detail
  (`emails.ts` deepLink default branch).
