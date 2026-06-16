# Session Log — 2026-06-16 (Studio auth flow fixes)

Addendum to the main 2026-06-16 log. This session focused on the
Studio sign-up → confirmation → sign-in chain that was breaking in
several places after the initial scaffold landed. End state: Martin
is signed in as an approved Studio user. Path to get there was
threaded; pieces are now in place so the next user doesn't repeat it.

## 1 · Structured login error panel

Login was surfacing a single red wall of text for auth failures.
Rebuilt the error path as a discriminated union:

```ts
type LoginError =
  | { kind: "structured"; title: string; reasons: string[]; footer?: string }
  | { kind: "plain"; message: string };
```

CSS `.errorPanel` renders a white card with red left-stripe accent,
title row, reasons stack (single lead paragraph for 1 reason / bullets
for many), hairline-divided footer note for the "still needs approval"
context. Replaces `.error` for the two common rewrites: unconfirmed
email and invalid credentials.

File: `apps/web/src/app/studio/login/page.tsx`,
`apps/web/src/app/studio/studio.module.css`.

## 2 · `/auth/callback` route + `emailRedirectTo`

The confirmation email Martin received pointed at Site URL fallback
(`https://www.ghostsignal.cloud/`) with `#access_token=...` in the
hash. The homepage didn't consume that hash → the session was never
established even on a valid click. The `otp_expired` he hit came on
top of an already-broken success path.

Built `apps/web/src/app/auth/callback/route.ts` — server-side Route
Handler:

- Reads `?code=` (PKCE), exchanges for a session via
  `supabase.auth.exchangeCodeForSession`, sets cookies, redirects to
  `/studio`.
- Reads `?error=...&error_code=...` (expired / used links) and
  forwards to `/studio/login?auth_error=otp_expired` so the
  structured panel renders a clear "register again, we'll resend"
  next-step.

Updated `signUp` in register to pass
`emailRedirectTo: ${window.location.origin}/auth/callback` so future
confirmation emails point there directly. Route is outside the
proxy.ts matcher → no auth gate on the callback itself.

Login page now hydrates a structured panel from `?auth_error=` /
`?auth_message=` query params.

**Manual config step (Martin, in Supabase Dashboard):** add
`https://ghostsignal.cloud/auth/callback`,
`https://www.ghostsignal.cloud/auth/callback`,
`http://localhost:3000/auth/callback` to the Redirect URLs allowlist
or `emailRedirectTo` silently falls back to Site URL.

## 3 · Obfuscated re-signUp detection + explicit resend

When Martin re-registered with the same email, Supabase's
email-enumeration protection kicked in: `signUp` returned 200 with a
**fake** user object (placeholder id, `identities: []`, no session).
Passing that placeholder id to `/api/studio/register` failed the
admin `getUserById` check and surfaced as "Could not verify the new
account."

Fix in `apps/web/src/app/studio/register/page.tsx`:

```ts
const isAlreadyRegistered =
  (data.user.identities ?? []).length === 0 && !data.session;
if (isAlreadyRegistered) {
  await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
  setSuccess({ email, needsEmailConfirmation: true });
  return;
}
```

Detect the obfuscation client-side, skip the members-row sync (it
already exists from the first attempt), explicitly call
`auth.resend({ type: "signup" })` to actually re-send the OTP.

## 4 · `/studio/reset-password` page for recovery flow

Supabase password-recovery emails land at Site URL with the session
in the URL hash (`#access_token=...&type=recovery`). Hash is
browser-only → no Route Handler can read it. Built
`apps/web/src/app/studio/reset-password/page.tsx` as a Client
Component:

- Mounts `createStudioBrowserClient` on mount; the SSR SDK has
  `detectSessionInUrl: true` by default, so it auto-consumes the hash.
- Listens for `PASSWORD_RECOVERY` / `SIGNED_IN` events. Also checks
  `getSession()` on mount in case the hash was already consumed by a
  reload.
- Shows "Set new password" form with confirm field + 8-char minimum.
- On submit, calls `supabase.auth.updateUser({ password })`, signs
  out, redirects to `/studio/login?reset=1`. Login subtitle now
  renders "Password updated. Sign in below with your new password."
  when `reset=1` is present.

## 5 · Diagnosing the silent recovery email

Even after building the recovery page, the email-based flow kept
failing. Sequence of diagnoses + dead ends (worth recording so the
next pass doesn't re-tread them):

1. **Email scanner pre-fetch theory.** The original confirmation link
   was pre-clicked by Martin's inbox security scanner, which consumed
   the OTP. By the time he clicked, it surfaced as `otp_expired`. But
   the auth user's `confirmed_at` was already populated — Martin
   initially mis-read this as missing, then found it after clicking
   into the user detail panel. So the account was confirmed all along.
2. **Resend silent no-op.** Despite the user being confirmed, our
   register-page resend call hit Supabase `/resend` with status 200,
   `mail_to: null`, `mail_from: null`, `error: null`. Confirmed by
   the Supabase auth log. Resend dashboard also showed only the
   original send from an hour earlier. Supabase intentionally returns
   200 with no mail dispatched when the user is already confirmed —
   that's by design (no-op for "resend signup" once confirmed).
   Theory was wrong but the dead-end is recorded.
3. **Recovery flow.** Switched Martin to password-recovery via
   Supabase Dashboard. He got the email but landed at
   `https://www.ghostsignal.cloud/#access_token=...&type=recovery` —
   the homepage had no handler. Built the `/studio/reset-password`
   page (above). Martin tried the URL-edit trick but the page
   didn't load for him (deploy timing or URL handling — never fully
   isolated; moved on).

## 6 · Bulletproof unblock: direct SQL password update

Pivoted to bypass every email/token/redirect path. SQL flow:

```sql
-- 1. hash a new password
SELECT extensions.crypt('CHOOSE_A_PASSWORD', extensions.gen_salt('bf'));

-- 2. set it on the user row (note: `confirmed_at` is a generated
--    column in current Supabase — only update `email_confirmed_at`)
UPDATE auth.users
SET encrypted_password = 'PASTE_HASH',
    email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'YOUR_EMAIL'
RETURNING email, LENGTH(encrypted_password);
```

`hash_length` should be 60, prefix `$2a$06$`. First attempt failed
because Martin's first SQL included `confirmed_at = NOW()` — that
column is now generated from `email_confirmed_at` and rejects manual
writes. Second attempt landed.

After the hash stuck, login still failed. Diagnostic:

```sql
SELECT encrypted_password = extensions.crypt('PASSWORD_TYPED_INTO_FORM', encrypted_password) AS matches
FROM auth.users WHERE email = 'YOUR_EMAIL';
```

Returned `false` — Martin had typed a different password into the
form than the one he hashed in step 1. Re-ran with a fresh
known-good password (`Studio2026Test`-style — no quote/escape
characters), login succeeded, he's now signed in.

## 7 · What's NOT fixed yet

The dashboard-triggered recovery flow still emails a Site-URL hash
link with no automatic recovery-page route. Two paths to close:

- Edit the Supabase **Password recovery email template** to use
  `{{ .SiteURL }}/studio/reset-password#access_token=...` directly
  instead of the default Site URL.
- Or add a small Client Component on the homepage that detects
  `#type=recovery` and bounces to `/studio/reset-password` with the
  hash preserved.

Also missing: a "Forgot password" link on `/studio/login` that calls
`supabase.auth.resetPasswordForEmail({ redirectTo: '/studio/reset-password' })`
directly from the app, bypassing the dashboard path.

Logged here so the next session can pick this up without re-diagnosing.

## Commits this session

- `b13d877` — structured two-section login error panel
- `1b29068` — `/auth/callback` route + `emailRedirectTo` wiring
- `6a0a022` — detect Supabase obfuscated re-signUp + explicit resend
- `65b3112` — `/studio/reset-password` page for recovery flow
