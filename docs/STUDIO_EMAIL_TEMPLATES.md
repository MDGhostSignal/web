# Studio auth email templates (Supabase)

Since 2026-07-29 the Studio register page passes the person's details
into Supabase Auth as user metadata:

```
data: { first_name, last_name, organization, member_kind }
```

Supabase's auth email templates read that metadata as `{{ .Data.* }}`,
so every auth email (confirmation, password reset, etc.) can greet the
person by name. **The templates live in the Supabase dashboard, not in
this repo** — apply them at:

> Supabase Dashboard → Authentication → Emails (templates)

Site-URL note: the register page sets `emailRedirectTo` to
`/auth/callback`; keep `{{ .ConfirmationURL }}` as-is in the template —
it already carries that redirect.

## Confirm signup (recommended template)

Subject:

```
{{ if .Data.first_name }}{{ .Data.first_name }}, confirm your GhostSignal Studio account{{ else }}Confirm your GhostSignal Studio account{{ end }}
```

Body (HTML):

```html
<h2>{{ if .Data.first_name }}Hi {{ .Data.first_name }},{{ else }}Hi,{{ end }}</h2>

<p>
  Welcome to GhostSignal Studio{{ if .Data.organization }} — great to
  have {{ .Data.organization }} on the network{{ end }}. One click and
  your account is live:
</p>

<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>

<p>
  After confirming, sign in and your workspace is ready — your profile,
  the roster, and your GhostSignal picks.
</p>

<p>— The GhostSignal team</p>
```

## Password reset (same pattern)

```html
<h2>{{ if .Data.first_name }}Hi {{ .Data.first_name }},{{ else }}Hi,{{ end }}</h2>
<p>Follow this link to reset your GhostSignal Studio password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>— The GhostSignal team</p>
```

## Notes

- `{{ .Data.first_name }}` is empty for accounts created before
  2026-07-29 (no metadata was passed then) — the `{{ if }}` fallbacks
  above keep those emails sensible.
- Available metadata keys: `first_name`, `last_name`, `organization`,
  `member_kind` ("brand" | "creator").
- Resend-driven app emails (Studio SMTP) are separate from these auth
  templates; this doc covers only the Supabase Auth emails.
