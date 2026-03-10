# RQ Quiz Status

This document captures the current state of the GhostSignal RQ / ORQ quiz implementation as of 2026-03-10.

## Purpose

The RQ quiz is GhostSignal's Resonance Index intake tool. It is used to:

- let creators, brands, and advertisers self-identify their resonance profile
- generate an RQ result for the user
- capture structured intake data for future matching workflows
- notify GhostSignal when a new submission is received

## Current Implementation Shape

The current implementation is still a Squarespace-oriented custom-code snippet, but it is now backed by the new website's server endpoint.

Core files:

- Squarespace / legacy snippet:
  - `apps/web/rq_quiz/rqv1.txt`
- Local browser preview:
  - `apps/web/public/rq-preview.html`
- Submission API endpoint:
  - `apps/web/src/app/api/rq-submissions/route.ts`
- Supabase schema:
  - `docs/RQ_SUBMISSIONS_SCHEMA.sql`
- Supabase setup guide:
  - `docs/RQ_SUPABASE_SETUP.md`
- Tool overview:
  - `docs/RQ_INDEX_TOOL.md`

## What The Snippet Now Does

The snippet now:

- renders the RQ questionnaire
- calculates the user's RQ result in-browser
- shows the result immediately
- posts the completed submission to the Next.js API endpoint
- shows visible success / error / info status messaging
- warns clearly if live capture has not been configured

## What The API Now Does

The API route at `apps/web/src/app/api/rq-submissions/route.ts` now:

- accepts `POST` submissions from the RQ snippet
- validates required fields
- writes the submission to Supabase
- returns a successful JSON response when storage completes
- sends an email notification for each successful submission
- exposes a `GET` connection-check endpoint for setup verification

## Supabase Status

The current storage target is Supabase.

Stored fields include:

- participant type
- first name
- last name
- role
- organization
- industry
- website
- email
- RQ code
- RQ name
- signal clarity label and note
- undertone
- full raw answers JSON
- profile JSON
- details JSON
- full submission payload JSON
- source metadata

## Email Notification Status

When configured, each successful submission triggers an email notification to:

- `hello@ghostsignal.cloud`

This uses:

- `RESEND_API_KEY`
- `RESEND_FROM`
- optional `RQ_NOTIFY_TO` override

Email sending is handled server-side only.

## Verified Working Locally

The following has been verified locally:

- `.env.local` is ignored by Git
- Supabase connection test at `/api/rq-submissions` returns success
- a localhost submission from `rq-preview.html` stores successfully in Supabase

This confirms that:

- environment variables are loading
- the API route can reach Supabase
- the snippet can submit successfully in local development

## Live Squarespace Requirement

For live Squarespace use, the page must define:

```html
<script>
  window.GHOSTSIGNAL_RQ_ENDPOINT = "https://YOUR_DEPLOYED_NEXT_SITE/api/rq-submissions";
</script>
```

That script must appear before the RQ snippet.

Without that, the live Squarespace page will generate the RQ result but will not know where to send the submission.

## Remaining Work

The main remaining production tasks are:

1. set the real deployed endpoint URL for the live Squarespace embed
2. configure Resend in the deployment environment so notification emails actually send
3. test a real external submission from Squarespace
4. later rebuild the quiz as a native feature in the new GhostSignal site

## Important Constraint

The `service_role` Supabase key must never be exposed in Squarespace or client-side code.

The architecture must remain:

- browser -> Next.js API route -> Supabase

not:

- browser -> Supabase directly
