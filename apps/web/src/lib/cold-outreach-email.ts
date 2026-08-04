/**
 * Cold-outreach email — shared template (brand prospecting).
 *
 * Single source of truth for Mike's cold reachout email so the send
 * route (/api/admin/outreach) and the preview endpoint
 * (/api/admin/outreach/preview) can never drift apart — same pattern
 * as lib/studio-invite-email.ts.
 *
 * STATUS: the surrounding pitch copy is a PLACEHOLDER — presentable,
 * but the team is writing the real email next. Replace the subject
 * and the pitch box below when the final copy lands; the personal
 * message block and the visual shell stay.
 *
 * Visual system matches the studio/auth emails: GHOSTSignal wordmark,
 * morse accent strip, table layout + inline styles, Outlook-safe
 * bgcolor CTA.
 */

export function coldOutreachSubject(name: string): string {
  // PLACEHOLDER subject — swap for the final line with the real copy.
  return `${name}, podcast advertising with GHOSTSignal`;
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

export function coldOutreachEmailHtml({
  name,
  message,
}: {
  name: string;
  /** Mike's personal message — the heart of the email. */
  message: string;
}): string {
  const safeName = escapeHtml(name);
  return `<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="background-color: #f4f6fb;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e6e8ee; border-radius: 14px;">

          <!-- Wordmark -->
          <tr>
            <td style="padding: 28px 36px 0;">
              <span style="font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: #0e1119;"><span style="font-weight: 800;">GHOST</span><span style="font-weight: 300;">Signal</span></span>
            </td>
          </tr>

          <!-- Morse accent strip -->
          <tr>
            <td style="padding: 18px 36px 0;">
              <div style="height: 3px; width: 220px; border-radius: 2px; background-color: #7c58d6; background-image: repeating-linear-gradient(90deg, #7c58d6 0 5px, #ffffff 5px 13px, #7c58d6 13px 33px, #ffffff 33px 41px, #7c58d6 41px 46px, #ffffff 46px 58px);"></div>
            </td>
          </tr>

          <!-- Greeting + personal message -->
          <tr>
            <td style="padding: 24px 36px 0;">
              <h1 style="margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #0e1119; line-height: 1.3;">Hi ${safeName},</h1>
              <p style="margin: 0; font-size: 15px; color: #5a5e66; line-height: 1.65;">
                ${textToHtml(message)}
              </p>
            </td>
          </tr>

          <!-- PLACEHOLDER pitch box — replace with the final copy -->
          <tr>
            <td style="padding: 24px 36px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="background-color: #f4f6fb; border: 1px solid #e6e8ee; border-radius: 10px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 13px; color: #5a5e66; line-height: 1.7;">
                      <span style="white-space: nowrap;"><strong style="color: #0e1119;">GHOST</strong><span style="font-weight: 300; color: #0e1119;">Signal</span></span> connects brands with vetted podcasts for values-aligned advertising &mdash; we read both sides of the network and broker the partnerships that fit.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 24px 36px 28px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td bgcolor="#7c58d6" style="background-color: #7c58d6; border: 1px solid #6a45c7; border-radius: 10px;">
                    <a href="https://www.ghostsignal.cloud/for-brands" target="_blank" style="display: inline-block; padding: 12px 26px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">Discover GHOSTSignal for brands</a>
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
                We reached out because we think your brand fits podcasts on our network. Not relevant? You can simply ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
