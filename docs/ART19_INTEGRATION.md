# ART19 Integration — Runbook

The `/admin/art19` tab (Phase B, not yet built) pulls show + episode data from [ART19](https://art19.com) — Amazon's podcast hosting + ad platform — into Supabase. This document is the operational reference: env setup, auth shape, monitoring, and known gaps.

## Status

| Phase | Status |
|---|---|
| **A · Foundation** (schema, REST client, sync orchestrator, cron) | **Shipped** — this commit |
| B · Dedicated `/admin/art19` tab + sidebar nav + read endpoints | Not started |
| C · "Total listens — last 30 days" KPI card on `/admin` dashboard | **Blocked** on listen-metric API access (see Known gaps) |
| D · E2E test script (`apps/web/scripts/test-art19.mjs`) | Not started |

## Architecture

Same shape as the Mercury integration:

```
GitHub Actions daily 04:00 UTC
      │ Bearer CRON_SECRET
      ▼
POST /api/admin/art19/sync
      │
      ▼  runArt19Sync()
      │
      ├── ART19 REST (art19.ts) ── pulls /networks, /series, /episodes
      │
      └── Supabase upsert: art19_network, art19_shows,
                           art19_episodes, art19_sync_runs
                                  │
                                  ▼
                  /admin/art19 dashboard reads from Supabase
                  (UI never calls ART19 directly)
```

## Auth

ART19 issues a **paired credential** via Support. Both pieces must appear in the `Authorization` header on every request:

```
Authorization: Token token="<shared-secret>", credential="<uuid>"
Accept: application/vnd.api+json
```

The spec source-of-truth is at <https://art19.com/swagger_json/external/content.json>. The human-readable docs live at <https://art19.com/api-docs>.

## Environment variables

Set in **both** `apps/web/.env.local` (for local dev + the smoke probe) and Vercel project settings (Production + Preview):

| Variable | Value |
|---|---|
| `ART19_API_TOKEN` | Shared secret issued by ART19 Support |
| `ART19_API_CREDENTIAL_ID` | UUID paired with the token, also from Support |
| `ART19_API_BASE_URL` | Optional override. Default `https://art19.com` |

Existing vars used: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

> **Quirk:** The base URL is `https://art19.com`, NOT `api.art19.com` and NOT `art19.com/api`. The docs folder URL has `/api-docs/` in it which is misleading — the actual endpoints sit at the root (e.g. `https://art19.com/series`).

## GitHub Actions secrets

Two repo secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `CRON_SECRET` | Same value already used by Mercury / alerts crons |
| `ART19_SYNC_URL` | `https://www.ghostsignal.cloud/api/admin/art19/sync` |

## Initial setup

1. **Apply the schema.** Run `docs/ART19_SUPABASE_SCHEMA.sql` in the Supabase SQL editor. Verify all 5 tables exist (`art19_network`, `art19_shows`, `art19_episodes`, `art19_listens_daily`, `art19_sync_runs`).
2. **Set the env vars** in Vercel (both Production and Preview). Redeploy so they take effect.
3. **Add the GitHub Actions secrets** as above.
4. **Smoke-test the sync** locally once creds are in `.env.local`:
   ```bash
   cd apps/web && node scripts/probe-art19.mjs
   ```
   Expect `HTTP 200` on `/networks`. If it returns `401` see the troubleshooting section.
5. **Trigger the first real sync** by hitting prod (gh CLI):
   ```
   gh workflow run "ART19 sync"
   ```
   Or visit `/admin/art19` once Phase B ships and click "Refresh now."
6. **Verify** via:
   ```sql
   select status, show_count, episode_count, error_message
   from art19_sync_runs order by started_at desc limit 5;
   ```

## Files

| Path | Purpose |
|---|---|
| `apps/web/src/lib/art19-types.ts` | JSON:API envelope types + resource→row mappers |
| `apps/web/src/lib/art19.ts` | REST client (paginate, list networks/series/episodes, ping) |
| `apps/web/src/lib/art19-sync.ts` | Sync orchestrator (`runArt19Sync`) |
| `apps/web/src/app/api/admin/art19/sync/route.ts` | Cron + on-demand sync endpoint |
| `apps/web/scripts/probe-art19.mjs` | Discovery / auth probe |
| `apps/web/src/proxy.ts` | `/api/admin/art19/sync` allowlist entry |
| `.github/workflows/art19-sync.yml` | Daily cron at 04:00 UTC |
| `docs/ART19_SUPABASE_SCHEMA.sql` | Database schema |

## Known gaps

### Listen / download metrics are not in the public API

The user's primary ask was **"total listens last month on the network"**. After scanning both the `external` and `internal` OpenAPI scopes (52 + 13 endpoints), no path exposes listen counts, downloads, engagement, or audience metrics.

The schema includes `art19_listens_daily` so the dashboard can be wired against a known shape, but Phase A leaves it empty. Resolution path:

1. **Email ART19 Support** (template in the 2026-06-01 session log) asking whether partners pull listen aggregates via:
   - A different API scope (`partner`, `analytics`, `stats`)
   - A scheduled CSV export
   - A webhook ART19 pushes daily
2. Once Support replies, add a step to `runArt19Sync` that populates `art19_listens_daily` accordingly.

## Troubleshooting

### `HTTP 401 Unauthorized` on every endpoint

Most common cause: the token+credential pair doesn't match. ART19 issues both together — having only the token (or having a stale UUID) returns 401 uniformly across all resources. Confirm via:

```bash
cd apps/web && node scripts/probe-art19.mjs
```

If every endpoint returns 401 with identical phrasing ("not authorized to perform the requested action on this resource"), email ART19 Support and ask them to confirm the current `token` + `credential` pair active on the account, or to reissue.

### `HTTP 400 Bad Request`

The header is malformed — usually the `credential="…"` part is missing or unquoted. Confirm the Authorization header reads exactly:

```
Token token="<secret>", credential="<uuid>"
```

(Quotes around both values, comma + space between them.)

### `HTTP 404` on a known resource

The base URL is wrong. Should be `https://art19.com` — NOT `https://api.art19.com` (DNS doesn't resolve), NOT `https://art19.com/api/series` (returns 404 with a JSON:API content-type, confusingly).

### Sync run shows `status = 'error'`

Check `error_message` in `art19_sync_runs`. Common entries:

- `ART19 401 on /networks :: ...` — credentials revoked/wrong. Confirm with Support.
- `Failed to upsert *: HTTP 5xx` — Supabase issue. Hit the sync route again or wait for the next cron tick.
- `ART19 is not configured` — env vars missing in Vercel.

## Operational notes

- **Cron cadence**: daily at 04:00 UTC. Show + episode metadata churns slowly enough that daily is plenty. If we add metrics that need fresher data, bump to hourly.
- **Pagination ceiling**: 50 pages × 50 records = 2500 records per resource per run. Set in `art19.ts:MAX_PAGES`. Generous; will need lifting only at extreme network sizes.
- **Idempotency**: every upsert uses `Prefer: resolution=merge-duplicates`. Re-running the sync mid-flight is safe.
- **No data deletion**: episodes/shows removed from ART19 don't get deleted from Supabase. If the team needs strict mirroring, add a "delete rows not in the latest sweep" step to the orchestrator.

## ART19 references

- API docs (rendered): <https://art19.com/api-docs>
- OpenAPI external scope: <https://art19.com/swagger_json/external/content.json>
- OpenAPI internal scope: <https://art19.com/swagger_json/internal/content.json>
- Platform: <https://art19.com>
