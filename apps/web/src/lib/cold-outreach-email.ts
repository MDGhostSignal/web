/**
 * Cold-outreach email — shared template (brand prospecting).
 *
 * Single source of truth for Mike's cold reachout email so the send
 * route (/api/admin/outreach) and the preview endpoint
 * (/api/admin/outreach/preview) can never drift apart — same pattern
 * as lib/studio-invite-email.ts.
 *
 * Structure per Mike's feedback (2026-08-06):
 *   1. personal paragraph (composer-edited — the heart)
 *   2. one-two sentence "what is this"
 *   3. "who we work with" — show our hand a bit
 * Tone target: personal, professional, not overly eager. Feel: light,
 * bright, open, inviting.
 *
 * Visual system: the studio light theme (studio-tokens.css) rendered
 * as email-safe literals — #fafbff canvas, white card, #7c58d6 accent,
 * soft-tint section panels with numbered chips, full-width morse
 * divider. Emails can't use CSS vars, so the hex values below mirror
 * the tokens; if the studio palette shifts, re-derive from
 * src/app/studio/studio-tokens.css. Table layout + inline styles,
 * Outlook-safe bgcolor CTA (radius/shadow degrade gracefully).
 *
 * WHO_WE_WORK_WITH: grounded in real facts (independent creators,
 * RQ screen, selectivity). When the team picks named shows/genres to
 * reveal, edit that constant only — it feeds both HTML and text parts.
 */

const ADVERTISERS_URL = "https://www.ghostsignal.cloud/for-advertisers";

/** Section 2 — the one-two sentence "what is this". */
const WHAT_IS_THIS =
  "GHOSTSignal is a podcast network that pairs brands with shows whose " +
  "audiences already share their values. We handle the whole partnership " +
  "— contracts, ad creation, transparent reporting — under one membership.";

/** Section 3 — show our hand. Swap in named shows/genres here when the
 *  team decides which to reveal. */
const WHO_WE_WORK_WITH =
  "Our creators are independent voices with considered, loyal audiences, " +
  "and we're selective on both sides: every partnership starts with our " +
  "Resonance Quotient, a framework that reads brand and show before we " +
  "propose a match. If we've reached out, it's because we think you'd " +
  "clear that bar.";

export function coldOutreachSubject(name: string): string {
  // Plain and descriptive on purpose — "not overly eager" (Mike).
  return `${name} — your brand on the right podcasts`;
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

/** textToHtml + the GHOSTSignal wordmark styled bold/light wherever it
 *  appears, so the pitch constants stay plain text. */
function pitchToHtml(s: string): string {
  return textToHtml(s).replaceAll(
    "GHOSTSignal",
    '<span style="white-space: nowrap;"><strong style="color: #0e1119;">GHOST</strong><span style="font-weight: 300; color: #0e1119;">Signal</span></span>',
  );
}

/** Plain-text part sent alongside the HTML (better spam scoring). */
export function coldOutreachEmailText({
  name,
  message,
}: {
  name: string;
  message: string;
}): string {
  return `Hi ${name},

${message}

What this is
${WHAT_IS_THIS}

Who we work with
${WHO_WE_WORK_WITH}

See how we work with brands: ${ADVERTISERS_URL}

- The GHOSTSignal team
We reached out because we think your brand fits podcasts on our network. Not relevant? You can simply ignore this email.`;
}

/** Numbered section header — chip ("01") + letter-spaced eyebrow. */
function sectionHeader(num: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="middle" style="padding: 0 9px 0 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td align="center" bgcolor="#ffffff" style="background-color: #ffffff; border: 1px solid #e0d5f5; border-radius: 7px; width: 24px; height: 22px; font-size: 10px; font-weight: 800; color: #6a45c7; text-align: center; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${num}</td>
                            </tr>
                          </table>
                        </td>
                        <td valign="middle" style="font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: #7c58d6;">${label}</td>
                      </tr>
                    </table>`;
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
<body style="margin: 0; padding: 0; background-color: #fafbff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#fafbff" style="background-color: #fafbff;">
    <tr>
      <td align="center" style="padding: 44px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 584px; background-color: #ffffff; border: 1px solid #e6e8ee; border-radius: 18px; box-shadow: 0 24px 60px -28px rgba(15, 23, 42, 0.15);">

          <!-- Header: wordmark + network pill -->
          <tr>
            <td style="padding: 30px 40px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle" style="font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: #0e1119;"><span style="font-weight: 800;">GHOST</span><span style="font-weight: 300;">Signal</span></td>
                  <td valign="middle" align="right">
                    <span style="display: inline-block; padding: 3px 11px; border: 1px solid #e0d5f5; border-radius: 999px; background-color: #faf8fe; font-size: 10px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #7c58d6;">Podcast Network</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Morse accent divider — full width of the card body -->
          <tr>
            <td style="padding: 20px 40px 0;">
              <div style="height: 3px; border-radius: 2px; background-color: #7c58d6; background-image: repeating-linear-gradient(90deg, #7c58d6 0 5px, #ffffff 5px 13px, #7c58d6 13px 33px, #ffffff 33px 41px, #7c58d6 41px 46px, #ffffff 46px 58px);"></div>
            </td>
          </tr>

          <!-- 1 · Greeting + personal message (the heart — stays open,
               reads like a letter, no panel) -->
          <tr>
            <td style="padding: 30px 40px 0;">
              <h1 style="margin: 0 0 14px; font-size: 23px; font-weight: 700; letter-spacing: -0.01em; color: #0e1119; line-height: 1.3;">Hi ${safeName},</h1>
              <p style="margin: 0; font-size: 15px; color: #5a5e66; line-height: 1.75;">
                ${textToHtml(message)}
              </p>
            </td>
          </tr>

          <!-- 2 · What this is — soft accent-tint panel -->
          <tr>
            <td style="padding: 30px 40px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f6f3fc" style="background-color: #f6f3fc; border: 1px solid #eae3f8; border-radius: 14px;">
                <tr>
                  <td style="padding: 20px 24px 18px;">
                    ${sectionHeader("01", "What this is")}
                    <p style="margin: 12px 0 0; font-size: 14px; color: #5a5e66; line-height: 1.75;">
                      ${pitchToHtml(WHAT_IS_THIS)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 3 · Who we work with — cool neutral panel -->
          <tr>
            <td style="padding: 14px 40px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f5f7fc" style="background-color: #f5f7fc; border: 1px solid #e6e8ee; border-radius: 14px;">
                <tr>
                  <td style="padding: 20px 24px 18px;">
                    ${sectionHeader("02", "Who we work with")}
                    <p style="margin: 12px 0 0; font-size: 14px; color: #5a5e66; line-height: 1.75;">
                      ${pitchToHtml(WHO_WE_WORK_WITH)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 28px 40px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td bgcolor="#7c58d6" style="background-color: #7c58d6; border: 1px solid #6a45c7; border-radius: 10px;">
                    <a href="${ADVERTISERS_URL}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">See how we work with brands</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 14px 0 0; font-size: 12px; color: #6a727b; line-height: 1.6;">
                Prefer a link? <a href="${ADVERTISERS_URL}" target="_blank" style="color: #7c58d6;">ghostsignal.cloud/for-advertisers</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 40px 30px; border-top: 1px solid #e6e8ee;">
              <p style="margin: 20px 0 0; font-size: 12px; color: #6a727b; line-height: 1.7;">
                &mdash; The <span style="white-space: nowrap;"><span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span></span> team<br>
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
