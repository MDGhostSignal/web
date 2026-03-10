# GhostSignal RQ Index Tool

This file documents the current **GhostSignal RQ Index** implementation that exists in this repository as a copy-and-paste Squarespace code snippet.

## Canonical Source in Repo

- Current snippet file: `apps/web/rq_quiz/rqv1.txt`

## What This Is

The RQ Index is GhostSignal's **Resonance Index tool**.

Its purpose is to let users freely complete the questionnaire, generate their RQ index result, and use that output as part of GhostSignal's matching process between:

- advertisers / brands
- creators / podcasts / aligned partners

This tool is part of GhostSignal's broader values-based matching and partnership workflow.

## Current State

- The current implementation is a **Squarespace code snippet**.
- It is designed to be pasted into Squarespace as an embedded custom-code block.
- The file in this repo should be treated as the current working reference for that legacy/live snippet.
- Submission capture is now designed to post to the Next.js endpoint:
  - `apps/web/src/app/api/rq-submissions/route.ts`
- Preferred storage target is **Supabase** using the environment variables documented in `apps/web/.env.example`.
- Suggested Supabase table schema lives at:
  - `docs/RQ_SUBMISSIONS_SCHEMA.sql`

## Product Intent

For now, the RQ Index will continue to live on the existing Squarespace site as an embedded code snippet so users can take the assessment there.

Later, this tool should be rebuilt as a **fully integrated product experience** inside the new GhostSignal website being developed in this repository.

## Future Direction

When rebuilding this for the new site, the goal is not just to paste the old snippet into Next.js. The long-term goal is to create a more complete, maintainable implementation that can support:

- a proper website-native UI
- cleaner data handling
- clearer result presentation
- future advertiser / brand / creator matching workflows
- any later backend, CRM, or lead-routing integrations

## Instruction for Future Agents

If future work references the "RQ index", "Resonance Index", or the GhostSignal assessment tool:

1. Start with `apps/web/rq_quiz/rqv1.txt` as the current source artifact.
2. Treat it as the legacy Squarespace implementation.
3. Preserve its business purpose during migration: helping GhostSignal evaluate resonance and support matching between advertisers, brands, creators, and other aligned partners.
4. Prefer documenting and extracting its logic carefully before replacing it with a new website-native build.
5. Keep the submission capture path intact so RQ results continue to be stored and reviewable while the snippet still lives on Squarespace.
