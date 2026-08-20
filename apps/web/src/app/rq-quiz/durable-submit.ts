/**
 * Durable persistence for the RQ quiz's completion write.
 *
 * The reveal a taker sees is computed client-side and shown immediately,
 * independent of the network. Persisting that result used to be a single
 * best-effort `fetch` fired after the reveal — so if it didn't land
 * (a closed tab, a flaky connection), the row stayed `incomplete` with
 * zero answers while the taker believed they were done. That's how
 * Elizabeth Santelmann's completion was lost.
 *
 * This module makes the completion write survivable:
 *   - `keepalive: true` so an in-flight request outlives tab-close /
 *     navigation (the most common loss),
 *   - a short retry loop for transient failures,
 *   - a `localStorage` fallback so an un-confirmed completion is
 *     re-attempted on the next page load until the server confirms it.
 *
 * The payload is small (basics + 15 answers + result), safely under the
 * ~64KB `keepalive` body cap.
 */

export type PendingRqCompletion = {
  /** The exact JSON body to (re)send — a stringified completion payload. */
  body: string;
  /** Lead-row id to PATCH up to complete; null falls back to a POST. */
  incompleteId: string | null;
  /** When this was queued (ms epoch) — used to expire stale entries. */
  savedAt: number;
};

const KEY = "gs.rq.pendingCompletion";
/** Stop re-attempting a completion older than this (a week). */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function savePending(pending: PendingRqCompletion): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* storage full / disabled — the live attempt is still our best shot */
  }
}

export function loadPending(): PendingRqCompletion | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as PendingRqCompletion;
    if (!pending?.body) return null;
    if (Date.now() - (pending.savedAt ?? 0) > MAX_AGE_MS) {
      clearPending();
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Send (or re-send) a completion. PATCHes the lead row when we have its
 * id (idempotent — safe to repeat), else POSTs a fresh complete row.
 * Retries transient failures; a 404 on the lead row falls back to a
 * POST (the lead was deleted); a 4xx (bad payload) stops early. Returns
 * whether the server confirmed the write, and the row id to reuse.
 */
export async function sendRqCompletion(
  pending: PendingRqCompletion,
): Promise<{ ok: boolean; id: string | null }> {
  let useId = pending.incompleteId;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        useId ? `/api/rq-submissions/${useId}` : "/api/rq-submissions",
        {
          method: useId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: pending.body,
          keepalive: true,
        },
      );

      if (res.ok) {
        let id: string | null = useId;
        try {
          const data = (await res.json()) as { id?: string | null };
          if (data?.id) id = String(data.id);
        } catch {
          /* body already applied — id stays as-is */
        }
        return { ok: true, id };
      }

      // Lead row gone — recreate it fresh via POST on the next pass.
      if (res.status === 404 && useId) {
        useId = null;
        continue;
      }
      // Other 4xx won't improve on retry (validation) — give up cleanly.
      if (res.status >= 400 && res.status < 500) {
        return { ok: false, id: useId };
      }
    } catch {
      /* network error — fall through to backoff + retry */
    }
    await delay(400 * (attempt + 1));
  }

  return { ok: false, id: useId };
}
