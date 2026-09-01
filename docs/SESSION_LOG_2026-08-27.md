# Session Log — 2026-08-27

## Studio nav / profile

- Tab label in `StudioHeader`: **My results** → **My character** (`/studio/results` route unchanged).
- Removed **Current podcast host** from `/studio/profile` (`ProfileForm`). CRM `pod_provider` column and admin display left in place so existing values are not wiped.

## Snowdrift stills — Work at the Speed of Human

New ink-on-white set (Taste / Last Human Advantage hand) vaulted at `assets/grok/stills/substack-work-at-the-speed-of-human/` (gitignored). Hero: helmet and clouds removed. Family table: kids on the floor past the table. Author footer for Jeremy + Martin is `assets/grok/references/snowdrift-published/outsource-footer.png`.

## Studio: Jack couldn't sign in after deleting himself

Jack deleted his CRM member row; the Supabase Auth user `jack@ghostsignal.cloud` (`b169416e-…`) stayed. Today's invite recreated a `members` row with `auth_user_id` null. Password sign-in succeeded, then `/studio` keyed off `auth_user_id` and rendered the public landing. Resend had already **delivered** the invite to `jack@ghostsignal.cloud` at 12:35 UTC — it was not a send failure.

### Repair (prod)

- Linked member `31016814-…` to auth user `b169416e-…` and set `activated_at`.
- Jack can sign in at `/studio/login` with his existing password. He does not need to register again.

### Code

- Invite: if an Auth user already exists for that email, re-attach + activate; email CTA goes to sign-in, not register. 409 only when already linked *and* activated.
- `loadCurrentStudioMember`: if no row by `auth_user_id`, adopt the email-matched row and write the link.
- Empty-loop guard: `/studio` and `/studio/pending` (and profile) no longer treat a live Auth session with no members row as “signed out.” They sign out and send `/studio/login?auth_error=unlinked` with a structured error.
- CRM `DELETE /api/members/:id` now deletes the leftover Auth user so a later invite can register cleanly.

### Files

- `apps/web/src/app/api/admin/studio/invite/route.ts`
- `apps/web/src/lib/studio-invite-email.ts`
- `apps/web/src/lib/studio-auth.ts`
- `apps/web/src/app/studio/page.tsx`
- `apps/web/src/app/studio/pending/page.tsx`
- `apps/web/src/app/studio/profile/page.tsx`
- `apps/web/src/app/studio/login/page.tsx`
- `apps/web/src/app/api/members/[id]/route.ts`

### Validation

- `npm run typecheck` (apps/web) — pass
- Prod member row verified after PATCH

### Open

- Don't hard-delete CRM contacts to "remove from Studio" — use the studio dossier deactivate (`activated_at → null`). CRM delete now also removes the Auth user.
