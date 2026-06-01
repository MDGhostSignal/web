# ART19 Integration — Runbook

The `/admin/art19` tab pulls show + episode data from [ART19](https://art19.com) — Amazon's podcast hosting + ad platform — into Supabase. This document is the operational reference: env setup, auth shape, monitoring, and quirks of the live API.

## Status

| Phase | Status |
|---|---|
| **A · Foundation** (schema, REST client, sync orchestrator, cron) | **Shipped** |
| **B · Dedicated `/admin/art19` tab** | **Shipped** |
| **C · "Lifetime listens" KPI on `/admin/art19`** | **Shipped** — uses real ART19 data |
| **D · Daily / date-ranged listens** | Pending — needs S3 daily export from ART19 Support |

## Architecture

```
GitHub Actions daily 04:00 UTC
      │ Bearer CRON_SECRET
      ▼
POST /api/admin/art19/sync
      │
      ▼  runArt19Sync()
      │
      ├── ART19 REST (art19.ts) — relationship walk from ART19_NETWORK_ID:
      │     /networks/{id}                              → network record
      │     /networks/{id}/relationships/series         → series refs
      │     /series/{id}    (×N)                        → series records
      │     /series/{id}/relationships/episodes         → episode refs
      │     /episodes/{id}  (×M)                        → episode records
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

## API quirks (discovered against the live API)

These bit us during Phase A→C and are now baked into the client. Future engineers, this list is gold:

1. **Base URL is `https://art19.com`** — NOT `api.art19.com` (DNS doesn't resolve), NOT `art19.com/api/*` (returns 404 with a JSON:API content-type, confusingly).

2. **Pagination uses Rails-style `page=N&per_page=M`**, NOT the JSON:API `page[size]=N` form that the spec advertises. The latter returns HTTP 400. Even stranger: ART19's own `links.next` URLs use `page[number]` / `page[size]` — which the server then rejects when followed. So we ignore `links.next` and walk pages manually.

3. **Collection endpoints (`/series`, `/episodes`) are essentially unusable for a single-account sync.** The credential has *global* read across ART19's platform — listing `/series` returns hundreds of unrelated podcasts. `filter[network_id]=...` and `filter[series_id]=...` are silently ignored. The supported pattern is to walk relationship endpoints starting from a known network ID:
   - `/networks/{id}/relationships/series`
   - `/series/{id}/relationships/episodes`

4. **`include=` is unreliable.** `?include=network` on `/series` returns 400. Stick to plain resource fetches.

5. **`/episodes` (unscoped) requires a query parameter** — returns 400 with "Required query parameter missing" even when authenticated. Same for `/episodes?filter[series_id]=...`. The relationship walk avoids this entirely.

## Environment variables

Set in **both** `apps/web/.env.local` (for local dev + the smoke probe) and Vercel project settings (Production + Preview):

| Variable | Value |
|---|---|
| `ART19_API_TOKEN` | Shared secret issued by ART19 Support |
| `ART19_API_CREDENTIAL_ID` | UUID paired with the token, also from Support |
| `ART19_NETWORK_ID` | UUID of the network to sync. For GhostSignal: `d40f1918-a60d-4eac-b1e7-55b357b3ce18` |
| `ART19_API_BASE_URL` | Optional override. Default `https://art19.com` |

Existing vars used: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

## GitHub Actions secrets

Two repo secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `CRON_SECRET` | Same value already used by Mercury / alerts crons |
| `ART19_SYNC_URL` | `https://www.ghostsignal.cloud/api/admin/art19/sync` |

## Initial setup

1. **Apply the schemas in Supabase SQL editor:**
   - `docs/ART19_SUPABASE_SCHEMA.sql` — base tables
   - `docs/ART19_LISTENS_MIGRATION.sql` — adds `listen_count` etc.
2. **Set the env vars** in Vercel (Production + Preview). Redeploy so they take effect.
3. **Add the GitHub Actions secrets** as above.
4. **Trigger the first sync** by hitting the prod endpoint with the cron secret, or click "Refresh now" on `/admin/art19`.
5. **Verify** via:
   ```sql
   select status, show_count, episode_count, error_message
   from art19_sync_runs order by started_at desc limit 5;

   select id, name, listen_count, series_count from art19_network;
   select id, title, listen_count, episode_count from art19_shows order by listen_count desc nulls last;
   ```

## Listen counts

The all-time IABv2.2-certified download total is available **directly on the API**, at every level:

- `GET /networks/{id}` → `attributes.listen_count` (network total)
- `GET /series/{id}` → `attributes.listen_count` (per show)
- `GET /episodes/{id}` → `attributes.listen_count` (per episode), plus `downloads_first_24_hours`

The sync captures all three. The dashboard's "Lifetime listens" KPI reads `art19_network.listen_count` directly.

**For date-ranged data** (e.g., "downloads this month, broken down by day"), the supported path is the **scheduled S3 daily export** delivered by ART19 Support. The API does not expose date-ranged listen breakdowns. Once the S3 export is set up, populate `art19_listens_daily` with the daily rows and the "Listens · last 30d" KPI lights up.

## Files

| Path | Purpose |
|---|---|
| `apps/web/src/lib/art19-types.ts` | JSON:API envelope types + resource→row mappers |
| `apps/web/src/lib/art19.ts` | REST client (relationship walk, pagination workaround) |
| `apps/web/src/lib/art19-sync.ts` | Sync orchestrator (`runArt19Sync`) |
| `apps/web/src/app/api/admin/art19/sync/route.ts` | Cron + on-demand sync endpoint |
| `apps/web/src/app/api/admin/art19/summary/route.ts` | Dashboard KPI data (includes totalListens) |
| `apps/web/src/app/api/admin/art19/shows/route.ts` | Shows table data (includes listen_count) |
| `apps/web/src/app/api/admin/art19/episodes/route.ts` | Episodes list data |
| `apps/web/src/app/api/admin/art19/listens/route.ts` | Date-ranged listens (waits on S3 export) |
| `apps/web/src/app/admin/art19/page.tsx` | Dashboard UI |
| `apps/web/src/proxy.ts` | `/api/admin/art19/sync` allowlist entry |
| `.github/workflows/art19-sync.yml` | Daily cron at 04:00 UTC |
| `docs/ART19_SUPABASE_SCHEMA.sql` | Base schema |
| `docs/ART19_LISTENS_MIGRATION.sql` | Adds listen_count and related columns |

## Troubleshooting

### `HTTP 401 Unauthorized` on every endpoint

Most common cause: the token+credential pair doesn't match. ART19 issues both together — having only the token (or having a stale UUID) returns 401 uniformly across all resources. Confirm by hitting `GET https://art19.com/networks/{ART19_NETWORK_ID}` with the paired Authorization header. If 401, email ART19 Support and ask them to confirm the active pair or reissue.

### `HTTP 400 Bad Request` on a sync

Almost always one of the API quirks above. Most common: pagination using `page[size]` instead of `page=N&per_page=M`. Check what URL the orchestrator is hitting (`error_message` in `art19_sync_runs`) and verify it conforms.

### Sync returns `status='ok'` but counts are 0

`ART19_NETWORK_ID` is wrong, or the credential doesn't actually have access to that network. Hit `GET /networks/{id}` directly to confirm both. The network record must exist on ART19 and the credential must be authorized for it.

### `HTTP 404` on a known resource

The base URL is wrong. Should be `https://art19.com` — NOT `https://api.art19.com`, NOT `https://art19.com/api/series`.

### Sync run shows `status = 'error'`

Check `error_message` in `art19_sync_runs`. Common entries:

- `ART19 401 on /networks/{id} :: ...` — credentials revoked/wrong. Confirm with Support.
- `Failed to upsert *: HTTP 5xx` — Supabase issue. Hit the sync route again or wait for the next cron tick.
- `ART19 is not configured` — env vars missing in Vercel.
- `ART19_NETWORK_ID missing` — set this env var.

## Operational notes

- **Cron cadence**: daily at 04:00 UTC. Show + episode metadata + listen counts churn slowly enough that daily is plenty. If we need fresher listen totals, bump to hourly.
- **API call count per sync**: 1 (network) + 1 (series refs) + N (series records, N = number of shows) + N (episode refs per show) + M (episode records, M = total episodes). For GhostSignal today: ~15 calls. Plenty of headroom under any reasonable rate limit.
- **Idempotency**: every upsert uses `Prefer: resolution=merge-duplicates`. Re-running the sync mid-flight is safe.
- **No data deletion**: episodes/shows removed from ART19 don't get deleted from Supabase. If the team needs strict mirroring, add a "delete rows not in the latest sweep" step to the orchestrator.

## ART19 references

- API docs (rendered): <https://art19.com/api-docs>
- OpenAPI external scope: <https://art19.com/swagger_json/external/content.json>
- Platform: <https://art19.com>
