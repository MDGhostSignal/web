/**
 * Studio invite email — shared template.
 *
 * Single source of truth for the invite email so the send route
 * (/api/admin/studio/invite), the admin preview endpoint
 * (/api/admin/studio/invite/preview), and the CRM form's default
 * welcome text can never drift apart. Pure string building — no
 * secrets, no node imports — so the default-text helper is safe to
 * import from client components too.
 *
 * Visual system matches the auth templates in
 * docs/STUDIO_EMAIL_TEMPLATES.md: wordmark + STUDIO pill, morse
 * accent strip, studio palette, Outlook-safe bgcolor CTA.
 */

export type InviteKind = "brand" | "creator";

/** The template welcome paragraph (Jack's copy, 2026-08-04). Shown
 *  prefilled in the CRM invite form; the team can replace it with a
 *  personal welcome before sending. Deliberately static — same text
 *  for brands and creators. */
export function defaultInviteWelcome(): string {
  return (
    "Welcome! The GHOSTSignal team would like to invite you to Studio" +
    "—the members’ workspace where brands and podcasts set up their " +
    "profile, complete the XQ/RQ alignment quiz, and manage their " +
    "account details. It’s the essential first step to help us connect " +
    "you with partners you can be proud of. (Setup takes ≈ 20 mins)"
  );
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Plain text → email-safe HTML: escaped, line breaks preserved. */
function textToHtml(s: string): string {
  return escapeHtml(s).replaceAll("\n", "<br>");
}

export function inviteEmailHtml({
  firstName,
  welcome,
  note,
  inviteUrl,
}: {
  firstName: string;
  /** The welcome paragraph — template or the team's personal text. */
  welcome: string;
  note: string | null;
  inviteUrl: string;
}): string {
  const name = escapeHtml(firstName);
  const noteBlock = note
    ? `
          <tr>
            <td style="padding: 24px 36px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="background-color: #f4f6fb; border-left: 3px solid #7c58d6; border-radius: 8px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #7c58d6;">A note from the team</p>
                    <p style="margin: 0; font-size: 14px; color: #0e1119; line-height: 1.65;">${textToHtml(note)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="background-color: #f4f6fb;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e6e8ee; border-radius: 14px;">

          <tr>
            <td style="padding: 28px 36px 0;">
              <span style="font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: #0e1119;">GHOSTSignal</span>
              <span style="display: inline-block; margin-left: 8px; padding: 2px 9px; border: 1px solid #7c58d6; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #7c58d6; vertical-align: 2px;">Studio</span>
            </td>
          </tr>

          <tr>
            <td style="padding: 18px 36px 0;">
              <div style="height: 3px; width: 220px; border-radius: 2px; background-color: #7c58d6; background-image: repeating-linear-gradient(90deg, #7c58d6 0 5px, #ffffff 5px 13px, #7c58d6 13px 33px, #ffffff 33px 41px, #7c58d6 41px 46px, #ffffff 46px 58px);"></div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 36px 0;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0e1119; line-height: 1.3;">Hi ${name},</h1>
              <p style="margin: 0; font-size: 15px; color: #5a5e66; line-height: 1.65;">
                ${textToHtml(welcome)}
              </p>
            </td>
          </tr>
          ${noteBlock}

          <tr>
            <td style="padding: 24px 36px 0;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td bgcolor="#7c58d6" style="background-color: #7c58d6; border: 1px solid #6a45c7; border-radius: 10px;">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 12px 26px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">Set up your account</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 14px 0 0; font-size: 12px; color: #6a727b; line-height: 1.6;">
                Button not working? Copy this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #7c58d6; word-break: break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 36px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="background-color: #f4f6fb; border: 1px solid #e6e8ee; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 13px; color: #5a5e66; line-height: 1.7;">
                      Your details are already filled in &mdash; check them, set a password, confirm your email and you&rsquo;re in. This link is personal to <strong style="color: #0e1119;">this email address</strong> and expires in 30 days; Studio is invite-only, so it&rsquo;s your key in.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px 28px; border-top: 1px solid #e6e8ee;">
              <p style="margin: 18px 0 0; font-size: 12px; color: #6a727b; line-height: 1.6;">
                &mdash; The GHOSTSignal team<br>
                You&rsquo;re receiving this because the GHOSTSignal team invited you to their members&rsquo; workspace. Not interested? You can simply ignore this email.
              </p>
            </td>
          </tr>

          <!-- Snowdrift ad — compact version of the starry card from the RQ results email -->
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
</html>`;
}
