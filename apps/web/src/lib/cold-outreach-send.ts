import {
  coldOutreachEmailHtml,
  coldOutreachEmailText,
  coldOutreachSubject,
} from "@/lib/cold-outreach-email";

/**
 * The single place a cold-outreach email is handed to Resend.
 *
 * Shared by the immediate "send now" path and the "schedule for later"
 * path — the only difference is whether `scheduledAt` is set. When it
 * is, we pass Resend's native `scheduled_at`, and Resend holds the mail
 * and delivers it at that exact instant (up to 30 days out), returning
 * an email id we keep so the send can later be rescheduled or canceled.
 *
 * Sends from a human at the verified domain (not the noreply address)
 * so a cold reachout reads personal and replies land in Mike's inbox.
 * Overridable via OUTREACH_FROM / OUTREACH_REPLY_TO.
 */

export type SendColdOutreachInput = {
  name: string;
  email: string;
  message: string;
  theme: "light" | "dark";
  /** Absolute delivery instant. Omit to send immediately. */
  scheduledAt?: Date;
};

export type SendColdOutreachResult =
  | { ok: true; resendId: string | null }
  | { ok: false; status: number; error: string };

const OUTREACH_FROM_DEFAULT = "Mike from GHOSTSignal <mike@ghostsignal.cloud>";

export async function sendColdOutreach(
  input: SendColdOutreachInput,
): Promise<SendColdOutreachResult> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return {
      ok: false,
      status: 500,
      error: "Email sending is not configured (RESEND_API_KEY).",
    };
  }

  const payload: Record<string, unknown> = {
    from: process.env.OUTREACH_FROM || OUTREACH_FROM_DEFAULT,
    to: [input.email],
    reply_to: process.env.OUTREACH_REPLY_TO || OUTREACH_FROM_DEFAULT,
    subject: coldOutreachSubject(input.name),
    html: coldOutreachEmailHtml({
      name: input.name,
      message: input.message,
      theme: input.theme,
    }),
    text: coldOutreachEmailText({ name: input.name, message: input.message }),
  };

  // Resend native scheduling — ISO 8601 UTC. Only set for future sends.
  if (input.scheduledAt) {
    payload.scheduled_at = input.scheduledAt.toISOString();
  }

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: `Could not reach Resend: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!res.ok) {
    const detail = await res.text();
    return {
      ok: false,
      status: 502,
      error: `Resend rejected the send (${res.status}): ${detail.slice(0, 200)}`,
    };
  }

  const data = (await res.json().catch(() => null)) as { id?: string } | null;
  return { ok: true, resendId: data?.id ?? null };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A freshly-scheduled email spends a few seconds in Resend's `queued`
 * state before it becomes `scheduled`, and PATCH/cancel 422 while it's
 * queued ("You can not edit an email that is not scheduled"). The delay
 * is variable and was observed >5s, so manage-ops retry through it
 * rather than failing a "schedule then immediately edit" click.
 * (Verified against the live API 2026-08-19.) If it's still queuing
 * after the budget, callers surface a friendly "try again shortly"
 * 409 rather than a hard error — the row is untouched, so a retry is
 * safe. Budget (~12s) sits under the routes' maxDuration=30.
 */
const MANAGE_RETRIES = 6;
const MANAGE_RETRY_MS = 2000;

/** True when Resend refused because the email hasn't left `queued` yet
 *  — a transient state the caller can retry out of. */
function isStillQueuing(status: number, detail: string): boolean {
  return status === 422 && /not scheduled/i.test(detail);
}

const QUEUING_MESSAGE =
  "This send is still being queued at Resend — give it a few seconds and try again.";

/**
 * Reschedule a queued Resend send to a new instant.
 * PATCH /emails/{id} with the new `scheduled_at`.
 */
export async function rescheduleColdOutreach(
  resendId: string,
  scheduledAt: Date,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { ok: false, status: 500, error: "RESEND_API_KEY not configured." };
  }
  let lastDetail = "";
  let lastStatus = 502;
  for (let attempt = 0; attempt < MANAGE_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(resendId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scheduled_at: scheduledAt.toISOString() }),
      });
    } catch (err) {
      return {
        ok: false,
        status: 502,
        error: `Could not reach Resend: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (res.ok) return { ok: true };
    lastStatus = res.status;
    lastDetail = await res.text();
    // Still queued → wait and retry. Other errors are terminal.
    if (!isStillQueuing(res.status, lastDetail) || attempt === MANAGE_RETRIES - 1) {
      break;
    }
    await sleep(MANAGE_RETRY_MS);
  }
  if (isStillQueuing(lastStatus, lastDetail)) {
    return { ok: false, status: 409, error: QUEUING_MESSAGE };
  }
  return {
    ok: false,
    status: 502,
    error: `Resend rejected the reschedule (${lastStatus}): ${lastDetail.slice(0, 200)}`,
  };
}

/**
 * Read a send's current delivery state from Resend (GET /emails/{id}).
 * Used by the reconcile safety net to true-up our row status against
 * Resend's reality. Returns Resend's `last_event` string (e.g.
 * "delivered", "sent", "scheduled", "canceled", "bounced") or null.
 */
export async function getColdOutreachDelivery(
  resendId: string,
): Promise<{ ok: true; lastEvent: string | null } | { ok: false; error: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { ok: false, error: "RESEND_API_KEY not configured." };
  let res: Response;
  try {
    res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(resendId)}`, {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  if (!res.ok) {
    return { ok: false, error: `Resend GET failed (${res.status}).` };
  }
  const data = (await res.json().catch(() => null)) as {
    last_event?: string;
  } | null;
  return { ok: true, lastEvent: data?.last_event ?? null };
}

/**
 * Cancel a queued Resend send. POST /emails/{id}/cancel.
 * Note: once canceled at Resend it cannot be rescheduled — the caller
 * should mark the row 'canceled' and require a fresh reachout to resend.
 */
export async function cancelColdOutreach(
  resendId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { ok: false, status: 500, error: "RESEND_API_KEY not configured." };
  }
  let lastStatus = 502;
  let lastDetail = "";
  for (let attempt = 0; attempt < MANAGE_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(
        `https://api.resend.com/emails/${encodeURIComponent(resendId)}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}` },
        },
      );
    } catch (err) {
      return {
        ok: false,
        status: 502,
        error: `Could not reach Resend: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (res.ok) return { ok: true };
    lastStatus = res.status;
    lastDetail = await res.text();
    // Still queued (transient) → retry. A late cancel of an
    // already-sent email is terminal.
    if (!isStillQueuing(res.status, lastDetail) || attempt === MANAGE_RETRIES - 1) {
      break;
    }
    await sleep(MANAGE_RETRY_MS);
  }
  if (isStillQueuing(lastStatus, lastDetail)) {
    return { ok: false, status: 409, error: QUEUING_MESSAGE };
  }
  // 404 / other 422 after retries → 409 so the UI can say "too late to
  // cancel" cleanly rather than a 502.
  return {
    ok: false,
    status: lastStatus === 404 || lastStatus === 422 ? 409 : 502,
    error: `Resend could not cancel it (${lastStatus}): ${lastDetail.slice(0, 200)}`,
  };
}
