# Session Log — 2026-09-10

## WIT v2 — Wander gold-sample + draft chrome

- Gold-sampled chapter **01 Wander** on `/what-is-this-v2` with space-magic plates (far/mid/near/light) and slow cinematic parallax.
- Draft banner simplified to **Draft** only; entry body no longer mentions Notturno; eyebrow → Threshold.
- Live `/what-is-this` and draft isolation unchanged.

### Files

- `apps/web/public/images/what-is-this-v2/wander/*.jpg`
- `apps/web/src/app/what-is-this-v2/scenes/narrativeScenes.tsx`
- `apps/web/src/app/what-is-this-v2/scenes.module.css`
- `apps/web/src/app/what-is-this-v2/page.tsx`
- `apps/web/src/app/what-is-this-v2/page.module.css`
- `apps/web/src/app/what-is-this-v2/chapters.ts`
- `apps/web/src/app/what-is-this-v2/placeholders.ts`

---

## Invitation — shared shell + creators copy + sunny hero

- Extracted `InvitationShell` so `/invitation` and `/invitation/creators` share identical markup/CSS; only features + quote differ.
- Creators benefits: Creative Freedom → Values-Aligned Partnerships → World-Making Membership; quote: “Advertising that builds trust with your audience.”
- Bigger/brighter hero lede; mobile `--edge-pad` scale-down; phone carousel shows one card.
- Swapped sunny hero video (trim first 0.5s logo; 1280×720 muted webm/mp4 + poster). Softened CSS warmth filter.

### Files

- `apps/web/src/app/invitation/InvitationShell.tsx` (new)
- `apps/web/src/app/invitation/invitationShared.ts` (new)
- `apps/web/src/app/invitation/page.tsx`
- `apps/web/src/app/invitation/creators/page.tsx`
- `apps/web/src/app/invitation/page.module.css`
- `apps/web/src/app/invitation/HeroBackgroundVideo.tsx`
- `apps/web/public/videos/invitation-hero.{webm,mp4}` + `invitation-hero-poster.jpg`

### Validation

- typecheck / lint:css / assets:audit — pass
- Playwright: invitation heroes load new webm (1280×720, ~14.5s); creators section order matches brand; H1/lede styles identical

---

## Invitation benefits width

- Widened shared How-we-do-it grid (`1024` → `1536`) so creator cards (esp. Values-Aligned Partnerships) sit wider and less tall.

## CRM cold outreach — brand vs creator audience

- Composer adds **Reach out to: Brand | Creator** selector.
- Email How-we-do-it benefits + pull-quote follow `/invitation` (brand) or `/invitation/creators` (creator); default personal note swaps with audience when still at the stock text.
- Wired through preview + send APIs (`audience` on body). Not stored on `cold_outreach` yet (same as theme).

### Files

- `apps/web/src/app/invitation/page.module.css`
- `apps/web/src/lib/cold-outreach-email.ts`
- `apps/web/src/lib/cold-outreach-send.ts`
- `apps/web/src/app/api/admin/outreach/route.ts`
- `apps/web/src/app/api/admin/outreach/preview/route.ts`
- `apps/web/src/app/admin/outreach/components/OutreachComposer.tsx`
- `apps/web/src/app/admin/outreach/outreach.module.css`
- `apps/web/src/app/admin/outreach/page.tsx`
- `docs/SESSION_LOG_2026-09-10.md`

### Validation

- typecheck / lint:css — pass
- Scripted email content checks: brand vs creator titles + quotes OK

### Open / next

- WIT v2: polish Wander or gold-sample Noise; music / page starfield still open; no live swap until called.
- Optional: persist `audience` on `cold_outreach` if Mike wants list filtering.
