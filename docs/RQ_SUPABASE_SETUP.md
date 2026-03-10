# RQ Supabase Setup

This is the setup path for storing GhostSignal RQ / ORQ quiz submissions in Supabase.

## What Already Exists In This Repo

- API endpoint:
  - `apps/web/src/app/api/rq-submissions/route.ts`
- Table schema:
  - `docs/RQ_SUBMISSIONS_SCHEMA.sql`
- Squarespace snippet source:
  - `apps/web/rq_quiz/rqv1.txt`

## Recommended Architecture

Do not send the Squarespace snippet directly to Supabase from the browser.

Use this flow instead:

1. User submits the RQ quiz on Squarespace.
2. The snippet posts to the Next.js endpoint:
   - `/api/rq-submissions`
3. The Next.js server writes the submission into Supabase using the service role key.

This keeps the service key server-side and gives us one stable ingestion path for both Squarespace and the future native website version.

## Supabase Dashboard Setup

In your Supabase project:

1. Open `SQL Editor`
2. Paste the contents of `docs/RQ_SUBMISSIONS_SCHEMA.sql`
3. Run the SQL

That creates the `rq_submissions` table and supporting indexes.

## Required Environment Variables

Set these in your Next.js environment:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
RQ_SUBMISSIONS_TABLE=rq_submissions
RQ_ALLOWED_ORIGINS=*
RESEND_API_KEY=re_...
RESEND_FROM=Ghost Signal <no-reply@yourdomain.com>
RQ_NOTIFY_TO=hello@ghostsignal.cloud
```

Notes:

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` come from:
  - Supabase Dashboard -> Project Settings -> API
- `RQ_ALLOWED_ORIGINS=*` is acceptable for early testing.
- `RESEND_API_KEY` and `RESEND_FROM` enable email notifications when a new RQ submission is stored.
- `RQ_NOTIFY_TO` is the destination inbox for RQ submission alerts.
- For production, replace `*` with a comma-separated allowlist, for example:

```env
RQ_ALLOWED_ORIGINS=https://your-squarespace-site.com,https://your-new-site.com
```

## Local Setup

In `apps/web`, create a local env file such as `.env.local` with the values above.

Then run:

```bash
npm run dev
```

## Connection Test

After `npm run dev`, open:

```text
http://localhost:3000/api/rq-submissions
```

Expected result when configured correctly:

```json
{
  "ok": true,
  "configured": true,
  "table": "rq_submissions",
  "emailConfigured": true,
  "emailTo": "hello@ghostsignal.cloud",
  "message": "Supabase connection is working for RQ submissions."
}
```

If the table is missing or the credentials are wrong, the endpoint will return an error payload explaining the failure.

## Squarespace Snippet Configuration

The snippet supports a configurable capture endpoint.

For local testing, it automatically uses:

```text
http://localhost:3000/api/rq-submissions
```

For live Squarespace usage, set:

```html
<script>
  window.GHOSTSIGNAL_RQ_ENDPOINT = "https://YOUR_DEPLOYED_NEXT_SITE/api/rq-submissions";
</script>
```

Place that before the RQ snippet in Squarespace.

This is the live endpoint the Squarespace version must post to.

## What Gets Stored

Each submission stores:

- participant basics
- email and organization
- all raw answers
- computed RQ code
- computed RQ name
- signal clarity
- profile text
- undertone
- source metadata

This makes the table usable both as:

- a lead / intake log
- a matching workflow input
- an export source for spreadsheets or CRM follow-up later

## Next Recommended Step

After Supabase is connected successfully:

1. test one local submission through `rq-preview.html`
2. confirm the row appears in Supabase
3. point the live Squarespace snippet at the deployed API endpoint
4. test a real external submission from Squarespace
