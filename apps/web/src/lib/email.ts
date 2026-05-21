/**
 * Thin Resend wrapper used by the Marketing Social Scheduler's daily
 * digest cron (and available to any future admin email).
 *
 * Direct `fetch` to https://api.resend.com/emails with the existing
 * `RESEND_API_KEY` + `RESEND_FROM` env vars — same approach the
 * existing RQ-submission emails take, just lifted into one place so
 * new callers don't have to re-implement the HTTP plumbing.
 *
 * The RQ email paths in apps/web/src/app/api/rq-submissions/emails.ts
 * remain unchanged for now. A future refactor can switch them to
 * call sendEmail() — they were left in place to avoid touching a
 * live, customer-facing email flow as part of an unrelated feature.
 */

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  /** Plain-text body. At least one of `text` or `html` is required. */
  text?: string;
  /** HTML body. At least one of `text` or `html` is required. */
  html?: string;
  /** Optional override for the `from:` line. Defaults to RESEND_FROM. */
  from?: string;
  /** Optional reply-to header. */
  replyTo?: string;
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: string; status?: number };

/**
 * Send a single transactional email via Resend.
 *
 * Returns a structured result rather than throwing — the cron route
 * wants to handle "Resend not configured" and "Resend API errored"
 * differently from a successful no-op, and wrapping in try/catch at
 * every call site is noisier than this shape.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const defaultFrom = process.env.RESEND_FROM;
  const from = input.from ?? defaultFrom;

  if (!apiKey || !from) {
    return {
      ok: false,
      reason:
        "Resend is not configured. Set RESEND_API_KEY and RESEND_FROM in .env.local.",
    };
  }

  if (!input.text && !input.html) {
    return { ok: false, reason: "Either text or html body is required." };
  }

  const to = Array.isArray(input.to) ? input.to : [input.to];
  if (to.length === 0) {
    return { ok: false, reason: "At least one recipient is required." };
  }

  const payload: Record<string, unknown> = {
    from,
    to,
    subject: input.subject,
  };
  if (input.text) payload.text = input.text;
  if (input.html) payload.html = input.html;
  if (input.replyTo && input.replyTo.includes("@")) {
    payload.reply_to = input.replyTo;
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      ok: false,
      reason: `Resend fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const body = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      reason: `Resend ${res.status}: ${body.slice(0, 400)}`,
      status: res.status,
    };
  }

  try {
    const json = JSON.parse(body) as { id?: string };
    return { ok: true, id: json.id ?? "" };
  } catch {
    return { ok: true, id: "" };
  }
}

/**
 * Parse a `RESEND_DIGEST_TO`-style env value: comma- or newline-
 * separated list of emails, trimmed, deduped, lowercased. Empty
 * input → empty array (caller decides what to do).
 */
export function parseRecipientList(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(/[,\n]/)) {
    const e = piece.trim().toLowerCase();
    if (!e) continue;
    if (!e.includes("@")) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out;
}

/** Minimal HTML escape for templating digest emails. */
export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
