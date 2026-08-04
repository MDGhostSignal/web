# Studio auth email templates (Supabase)

Since 2026-07-29 the Studio register page passes the person's details
into Supabase Auth as user metadata:

```
data: { first_name, last_name, organization, member_kind }
```

Supabase's auth email templates read that metadata as `{{ .Data.* }}`,
so every auth email (confirmation, password reset, etc.) greets the
person by name. **The templates live in the Supabase dashboard, not in
this repo** — apply them at:

> Supabase Dashboard → Authentication → Emails (templates)

## Design notes (v2, branded)

The HTML below mirrors the Studio surface's design system
(`apps/web/src/app/studio/studio-tokens.css` + the Lite landing):

- Wordmark lockup: **GHOSTSignal** (17px / 800 / tight tracking) +
  the bordered uppercase **STUDIO** pill.
- The morse-code accent strip from the landing hero
  (repeating-gradient on `#7c58d6`; clients without gradient support
  degrade to a solid accent bar).
- Studio light palette: page `#f4f6fb`, card `#ffffff`, borders
  `#e6e8ee`, text `#0e1119` / `#5a5e66` / muted `#6a727b`, accent
  `#7c58d6` (border `#6a45c7`).
- Table-based layout + inline styles only (email-client safe); the
  CTA is a `bgcolor` table cell so Outlook renders a solid button.
- Keep `{{ .ConfirmationURL }}` exactly as written — it already
  carries the `/auth/callback` redirect. The fallback under the button
  is a short muted text link ("Use this confirmation link") rather
  than the raw URL — Supabase token URLs are hundreds of characters
  and dominated the layout when printed (Martin, 2026-08-04).

## Confirm signup

Subject:

```
{{ if .Data.first_name }}{{ .Data.first_name }}, confirm your GHOSTSignal Studio account{{ else }}Confirm your GHOSTSignal Studio account{{ end }}
```

Body (HTML):

```html
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="background-color: #f4f6fb;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e6e8ee; border-radius: 14px;">

          <!-- Wordmark lockup -->
          <tr>
            <td style="padding: 28px 36px 0;">
              <span style="font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: #0e1119;">GHOSTSignal</span>
              <span style="display: inline-block; margin-left: 8px; padding: 2px 9px; border: 1px solid #7c58d6; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #7c58d6; vertical-align: 2px;">Studio</span>
            </td>
          </tr>

          <!-- Morse accent strip -->
          <tr>
            <td style="padding: 18px 36px 0;">
              <div style="height: 3px; width: 220px; border-radius: 2px; background-color: #7c58d6; background-image: repeating-linear-gradient(90deg, #7c58d6 0 5px, #ffffff 5px 13px, #7c58d6 13px 33px, #ffffff 33px 41px, #7c58d6 41px 46px, #ffffff 46px 58px);"></div>
            </td>
          </tr>

          <!-- Greeting + copy -->
          <tr>
            <td style="padding: 24px 36px 0;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0e1119; line-height: 1.3;">
                {{ if .Data.first_name }}Hi {{ .Data.first_name }},{{ else }}Hi,{{ end }}
              </h1>
              <p style="margin: 0; font-size: 15px; color: #5a5e66; line-height: 1.65;">
                Welcome to GHOSTSignal Studio{{ if .Data.organization }} &mdash; great to have <strong style="color: #0e1119;">{{ .Data.organization }}</strong> on the network{{ end }}. One click and your account is live:
              </p>
            </td>
          </tr>

          <!-- CTA button (bgcolor cell = Outlook-safe) -->
          <tr>
            <td style="padding: 24px 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td bgcolor="#7c58d6" style="background-color: #7c58d6; border: 1px solid #6a45c7; border-radius: 10px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 26px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">Confirm your email</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 14px 0 0; font-size: 11px; color: #9aa1ab; line-height: 1.6;">
                Button not working? <a href="{{ .ConfirmationURL }}" style="color: #6a727b;">Use this confirmation link</a> instead.
              </p>
            </td>
          </tr>

          <!-- What's inside -->
          <tr>
            <td style="padding: 24px 36px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="background-color: #f4f6fb; border: 1px solid #e6e8ee; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 13px; color: #5a5e66; line-height: 1.7;">
                      After confirming, sign in and your workspace is ready &mdash;
                      set up <strong style="color: #0e1119;">your profile</strong>, complete the
                      <strong style="color: #0e1119;">XQ/RQ alignment quizzes</strong>, and manage your
                      <strong style="color: #0e1119;">account details</strong>. (Setup takes &asymp; 20 mins)
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 36px 28px; border-top: 1px solid #e6e8ee;">
              <p style="margin: 18px 0 0; font-size: 12px; color: #6a727b; line-height: 1.6;">
                &mdash; The GHOSTSignal team<br>
                You&rsquo;re receiving this because this address was used to sign up for GHOSTSignal Studio. If that wasn&rsquo;t you, you can ignore this email.
              </p>
            </td>
          </tr>

          <!-- Snowdrift ad — same compact starry card as the invite email -->
          <tr>
            <td style="padding: 0 36px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#0a0a0d" style="background-color: #0a0a0d; background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 1px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.08) 1px, transparent 1px), radial-gradient(circle at 90% 50%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 10% 60%, rgba(255,255,255,0.1) 1px, transparent 1px); border-radius: 10px;">
                <tr>
                  <td align="center" style="padding: 20px 24px 22px;">
                    <img src="https://www.ghostsignal.cloud/images/brand/snowdrift-logo-white.png" alt="Snowdrift" width="80" style="display: block; margin: 0 auto 10px;">
                    <p style="margin: 0 0 12px; font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.6;">
                      Snowdrift is a <span style="white-space: nowrap;"><span style="font-weight: 700; color: #ffffff;">GHOST</span><span style="font-weight: 300; color: #ffffff;">Signal</span></span> transmission &mdash; thoughts for a community of world makers.
                    </p>
                    <a href="https://snowdriftghostsignal.substack.com/" target="_blank" style="display: inline-block; padding: 9px 18px; background: rgba(255,255,255,0.08); color: #ffffff; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
                      Subscribe to the Snowdrift Newsletter
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Reset password

Subject:

```
{{ if .Data.first_name }}{{ .Data.first_name }}, reset your GHOSTSignal Studio password{{ else }}Reset your GHOSTSignal Studio password{{ end }}
```

Body (HTML):

```html
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="background-color: #f4f6fb;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e6e8ee; border-radius: 14px;">

          <!-- Wordmark lockup -->
          <tr>
            <td style="padding: 28px 36px 0;">
              <span style="font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: #0e1119;">GHOSTSignal</span>
              <span style="display: inline-block; margin-left: 8px; padding: 2px 9px; border: 1px solid #7c58d6; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #7c58d6; vertical-align: 2px;">Studio</span>
            </td>
          </tr>

          <!-- Morse accent strip -->
          <tr>
            <td style="padding: 18px 36px 0;">
              <div style="height: 3px; width: 220px; border-radius: 2px; background-color: #7c58d6; background-image: repeating-linear-gradient(90deg, #7c58d6 0 5px, #ffffff 5px 13px, #7c58d6 13px 33px, #ffffff 33px 41px, #7c58d6 41px 46px, #ffffff 46px 58px);"></div>
            </td>
          </tr>

          <!-- Greeting + copy -->
          <tr>
            <td style="padding: 24px 36px 0;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0e1119; line-height: 1.3;">
                {{ if .Data.first_name }}Hi {{ .Data.first_name }},{{ else }}Hi,{{ end }}
              </h1>
              <p style="margin: 0; font-size: 15px; color: #5a5e66; line-height: 1.65;">
                Follow the link below to set a new password for your GHOSTSignal Studio account:
              </p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td style="padding: 24px 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td bgcolor="#7c58d6" style="background-color: #7c58d6; border: 1px solid #6a45c7; border-radius: 10px;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 26px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">Reset password</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 14px 0 0; font-size: 11px; color: #9aa1ab; line-height: 1.6;">
                Button not working? <a href="{{ .ConfirmationURL }}" style="color: #6a727b;">Use this reset link</a> instead.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px 28px;">
              <p style="margin: 0 0 18px; padding: 16px 20px; background-color: #f4f6fb; border: 1px solid #e6e8ee; border-radius: 10px; font-size: 13px; color: #5a5e66; line-height: 1.7;">
                Didn&rsquo;t request this? You can safely ignore this email &mdash; your password stays unchanged.
              </p>
              <p style="margin: 0; padding-top: 18px; border-top: 1px solid #e6e8ee; font-size: 12px; color: #6a727b; line-height: 1.6;">
                &mdash; The GHOSTSignal team
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Invite email (code-managed — nothing to paste)

The team-initiated Studio invite ("+ Invite member" on
/admin/studio-members) is NOT a Supabase template. It's sent through
Resend by `apps/web/src/app/api/admin/studio/invite/route.ts`, using
the same visual system as the templates above (wordmark + STUDIO pill,
morse strip, studio palette, bgcolor CTA). Design changes to it ship
with normal deploys.

Contents (invite-only era, 2026-08-04): personalized greeting, the
welcome paragraph (template default from
`lib/studio-invite-email.ts#defaultInviteWelcome`, replaceable per
invite in the CRM modal), an optional "A note from the team" block
(purple-edged callout), CTA → `/studio/register?invite=<signed
token>` (the only way past the invite-only gate; prefills the form,
locks email + member type, expires in 30 days), a personal-link hint
box, and the compact Snowdrift ad. Previewable exactly as sent via
the modal's "Preview email" button.

## Notes

- `{{ .Data.first_name }}` is empty for accounts created before
  2026-07-29 (no metadata was passed then) — the `{{ if }}` fallbacks
  keep those emails sensible.
- Available metadata keys: `first_name`, `last_name`, `organization`,
  `member_kind` ("brand" | "creator").
- Resend-driven app emails (Studio SMTP) are separate from these auth
  templates; this doc covers only the Supabase Auth emails.
