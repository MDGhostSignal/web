# Session log 2026-10-16

Mike's review of the live site. Three notes. Two became copy edits. One was already done.

## 1. What Is This food animation

Mike asked to remove the pairing animation beside "What if advertising could make harmony?" He described it as a food carousel (cookies and milk, pizza and beer, oysters and lemon, hot dog and a baseball).

Already gone. Commit `5a192e8` deleted `HarmonyPair.tsx` and `HarmonyPair.module.css` (the milk-and-cookie drag). The other food pairs were never built. The live homepage HTML at ghostsignal.cloud shows the headline, the Values-Aligned Advertising paragraph, and "Find my match" in that band, with no pairing graphic.

No code change this session.

## 2. Life Giving Pages title

Deck header on `/life-giving-pages` changed from "Life Giving Pages Proposal V1" to "Life Giving Pages Proposal".

The browser tab title was already "Life Giving Pages — Brand Proposal | GHOSTSignal" and was left alone.

## 3. Podcaster → creator

Mike: comb the site and switch "podcaster" for "creator".

Replacements:

- Default site title: "partnerships for creators and advertisers".
- Who Are We promise: "For Creators".
- For Creators card: "like-minded creators and brands".
- For Advertisers card: "individual creator contracts".
- Contact section and Get in Touch: "Creator or Advertiser, ready to find your frequency?"
- Contact notification email type label: "Creator" (form value `podcast` is unchanged).
- Signal sheet RQ definition: "Creators:" and "paired with creators".
- Snowdrift: "For creators, it's a radar" (was "podcasters and creators", which would have doubled the word).
- RQ quiz and `public/rq-preview.html`: type choice is "Creator" (was "Creator / Podcaster").
- XQ/RQ world-maker chips: the Podcasters chip was removed. Creators was already on the list.
- Admin page catalog blurb for the creators pitch.
- Studio marketplace mock blurb: "Loved by creators."
- Shipped white paper heading: "For Creators: Sustainable and Dignified Monetisation".

Left on purpose:

- Holly Mackle proposal bio still says "writer, podcaster". That describes her, not the GhostSignal audience.
- White paper citation of the Independent Podcaster Report.
- The words "podcast" and "podcasting" everywhere else, including the contact form legend "Podcast or Advertiser?", "Organization / Podcast name", show-hosting copy, and platform names such as Apple Podcasts.

## Files

- `apps/web/src/app/life-giving-pages/page.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/who-are-we/page.tsx`
- `apps/web/src/app/for-creators/page.tsx`
- `apps/web/src/app/for-advertisers/page.tsx`
- `apps/web/src/app/get-in-touch/page.tsx`
- `apps/web/src/components/ContactSection/ContactSection.tsx`
- `apps/web/src/app/api/contact/route.ts`
- `apps/web/src/app/signal-sheet/page.tsx`
- `apps/web/src/app/snowdrift/page.tsx`
- `apps/web/src/app/rq-quiz/page.tsx`
- `apps/web/public/rq-preview.html`
- `apps/web/src/app/xqrq/page.tsx`
- `apps/web/src/app/admin/pages/page.tsx`
- `apps/web/src/lib/marketplace-mocks.ts`
- `apps/web/public/brand/WHITE_PAPER.md`

## Validation

- Copy-only. No typecheck, lint, or browser pass.
- Remaining "podcaster" hits under `apps/web` are the Holly bio and the white-paper citation.

## Ship

- Committed and pushed to `main`. Vercel deploys from `main`.
