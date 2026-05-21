import { NextResponse, type NextRequest } from "next/server";

import type {
  MercuryAccountRow,
  MercuryTransactionRow,
} from "@/lib/mercury-types";
import {
  formatRelativeTimePast,
  parseAmountCents,
  sumAmountsCents,
} from "@/lib/mercury-types";
import { supabaseRest } from "@/lib/supabase-admin";

const BIGINT_ZERO = BigInt(0);
const DEFAULT_DAYS = 90;
const MAX_DAYS = 365;
const MAX_TX_PER_ACCOUNT = 5000; // Generous; bounded so the endpoint never blows up.

/**
 * GET /api/admin/finance/trend?days=90
 *
 * Returns a daily cash-position series for the consolidated balance
 * across all accounts, plus a per-account 7-day series for the
 * AccountCard sparklines. Series are computed server-side so the
 * dashboard payload stays small (one number per day, not 5000 raw
 * transactions).
 *
 * Math (no JS Number on currency anywhere):
 *   balance_at_end_of_day(d)
 *     = current_balance
 *       - sum(amount of transactions with posted_at > end_of_day(d))
 *
 * Pending transactions (null posted_at) don't shift historical balance —
 * they only affect "today" once they post. So we treat null posted_at
 * as "not yet contributing to history."
 *
 * Auth: handled by the proxy matcher in src/proxy.ts.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = clampInt(searchParams.get("days"), DEFAULT_DAYS, 7, MAX_DAYS);

  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [accountsRes, txRes] = await Promise.all([
    supabaseRest<MercuryAccountRow[]>(
      "mercury_accounts?select=id,current_balance,currency&order=name.asc",
    ),
    supabaseRest<MercuryTransactionRow[]>(
      `mercury_transactions?select=account_id,posted_at,amount&posted_at=gte.${encodeURIComponent(sinceIso)}&order=posted_at.desc&limit=${MAX_TX_PER_ACCOUNT}`,
    ),
  ]);

  if (!accountsRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to load accounts.", detail: accountsRes.detail },
      { status: 502 },
    );
  }
  if (!txRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load transactions for trend.",
        detail: txRes.detail,
      },
      { status: 502 },
    );
  }

  const accounts = accountsRes.data;
  const transactions = txRes.data;

  // For each day, walk backwards from today. Reuse a running net-flow
  // accumulator so the inner loop is O(transactions), not O(days × tx).

  // Sort transactions descending by posted_at so we can drain them as
  // we step backwards through the day cursor.
  const txSorted = transactions
    .filter((t) => t.posted_at != null)
    .sort((a, b) => {
      const aT = new Date(a.posted_at as string).getTime();
      const bT = new Date(b.posted_at as string).getTime();
      return bT - aT; // descending
    });

  // currentBalance (cents) — start from "now."
  let runningCents = sumAmountsCents(accounts.map((a) => a.current_balance));

  // Per-account running cents map for the per-account 7-day series.
  const perAccountRunning = new Map<string, bigint>();
  for (const a of accounts) {
    perAccountRunning.set(a.id, parseAmountCents(a.current_balance));
  }

  // Cursor: end-of-today (UTC) → step back one day at a time.
  const endOfToday = endOfUTCDay(new Date());
  const dayMs = 24 * 60 * 60 * 1000;

  type DayPoint = {
    date: string; // YYYY-MM-DD (UTC)
    totalBalance: string; // formatted as "1234.5678"
  };
  type AccountDayPoint = {
    date: string;
    balance: string;
  };

  const days_out: DayPoint[] = [];
  const perAccountSeries = new Map<string, AccountDayPoint[]>();
  for (const id of perAccountRunning.keys()) perAccountSeries.set(id, []);

  let txIdx = 0;
  for (let dOffset = 0; dOffset <= days; dOffset++) {
    const dayEnd = new Date(endOfToday.getTime() - dOffset * dayMs);

    // Drain transactions posted AFTER this day's end out of the running
    // balance — i.e. transactions that happened later in time. Their
    // sum is what we subtract to get the balance at end of `dayEnd`.
    while (
      txIdx < txSorted.length &&
      new Date(txSorted[txIdx].posted_at as string).getTime() > dayEnd.getTime()
    ) {
      const t = txSorted[txIdx];
      const cents = parseAmountCents(t.amount);
      runningCents -= cents;
      const prev = perAccountRunning.get(t.account_id) ?? BIGINT_ZERO;
      perAccountRunning.set(t.account_id, prev - cents);
      txIdx++;
    }

    const date = isoDateUTC(dayEnd);
    days_out.unshift({
      date,
      totalBalance: centsToString(runningCents),
    });

    // Only collect per-account points for the last 7 days for the
    // sparklines. Saves payload size.
    if (dOffset <= 7) {
      for (const [id, cents] of perAccountRunning) {
        const arr = perAccountSeries.get(id);
        if (arr) arr.unshift({ date, balance: centsToString(cents) });
      }
    }
  }

  // Latest sync info for the staleness badge (cheap and convenient
  // to bundle into the same payload — saves the client a second call).
  const syncRes = await supabaseRest<
    Array<{ started_at: string; finished_at: string | null; status: string }>
  >("mercury_sync_runs?select=started_at,finished_at,status&order=started_at.desc&limit=1");
  const lastSync = syncRes.ok && syncRes.data.length > 0 ? syncRes.data[0] : null;

  return NextResponse.json({
    ok: true,
    days: days_out,
    perAccount: Array.from(perAccountSeries.entries()).map(([accountId, series]) => ({
      accountId,
      series,
    })),
    lastSyncedRelative: lastSync
      ? formatRelativeTimePast(lastSync.finished_at ?? lastSync.started_at)
      : "never",
  });
}

/* --- Utilities -------------------------------------------------------- */

function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function endOfUTCDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  );
}

function isoDateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Render bigint cents (numeric(20,4) scale) back into a `"1234.5678"`
 * string so the client can re-parse with parseAmountCents and avoid
 * any Number coercion in the network layer.
 */
function centsToString(cents: bigint): string {
  const scale = BigInt(10000);
  const negative = cents < BIGINT_ZERO;
  const abs = negative ? -cents : cents;
  const whole = abs / scale;
  const frac = abs % scale;
  const fracStr = frac.toString().padStart(4, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fracStr}`;
}
