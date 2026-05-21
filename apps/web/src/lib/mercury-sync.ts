/**
 * Mercury → Supabase sync orchestrator.
 *
 * Pulls the latest accounts + last 30 days of transactions from Mercury
 * and upserts them into Supabase. Invoked every 15 minutes by Vercel
 * Cron (see apps/web/vercel.json) and on demand by the "Refresh now"
 * button on /admin/finance.
 *
 * Invariants:
 *  - Idempotent: re-running mid-day refreshes `updated_at` but never
 *    creates duplicate rows. PostgREST `on_conflict=id` + merge-duplicates.
 *  - Bounded: 5 pages × 500 tx per account per sync = 2500 tx ceiling
 *    per account per run. Generous for our actual volume; protects us
 *    from runaway syncs if a single account ever pages forever.
 *  - Observable: every invocation writes a `mercury_sync_runs` row,
 *    success or failure, so the dashboard can show "last synced X ago"
 *    and the failure mode without us spelunking through Vercel logs.
 *
 * Errors caught at the top: the sync_run row gets `status='error'` and
 * `error_message`, then we re-throw so the calling route returns 502.
 */

import {
  listAccountTransactions,
  listAccounts,
  MercuryError,
} from "@/lib/mercury";
import type {
  MercuryAccount,
  MercuryTransaction,
} from "@/lib/mercury-types";
import { maskAccountNumber } from "@/lib/mercury-types";
import { supabaseRest } from "@/lib/supabase-admin";

// 90 days covers both the dashboard's 90-day trend chart and the
// 30-day KPI window. Each sync pulls this much; the bounded
// TX_MAX_PAGES (× TX_PAGE_SIZE) cap protects against runaway sync time
// for unusually busy accounts.
const TX_LOOKBACK_DAYS = 90;
const TX_PAGE_SIZE = 500;
const TX_MAX_PAGES = 5; // hard cap: 2500 tx per account per run
const UPSERT_BATCH_SIZE = 200;

export interface SyncResult {
  ok: true;
  runId: string;
  accountCount: number;
  transactionCount: number;
  durationMs: number;
}

export interface SyncFailure {
  ok: false;
  runId: string | null;
  message: string;
}

/**
 * Top-level sync entry point. Used by the cron route handler and by
 * the on-demand refresh button. Never throws — wraps failures in a
 * structured result so callers can render them in the dashboard.
 */
export async function runMercurySync(): Promise<SyncResult | SyncFailure> {
  const start = Date.now();
  const runId = await openSyncRun();
  if (!runId) {
    return {
      ok: false,
      runId: null,
      message:
        "Could not open a sync_runs row in Supabase. " +
        "Check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  try {
    const accounts = await listAccounts();
    await upsertAccounts(accounts);

    const since = new Date(
      Date.now() - TX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10); // YYYY-MM-DD

    let txTotal = 0;
    for (const account of accounts) {
      const txs = await pullAccountTransactions(account.id, since);
      // Stamp the accountId because Mercury sometimes omits it when the
      // endpoint is already scoped to a single account.
      for (const t of txs) t.accountId ||= account.id;
      txTotal += await upsertTransactions(txs);
    }

    await closeSyncRun(runId, {
      status: "ok",
      account_count: accounts.length,
      transaction_count: txTotal,
    });

    return {
      ok: true,
      runId,
      accountCount: accounts.length,
      transactionCount: txTotal,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const message = formatSyncError(err);
    await closeSyncRun(runId, {
      status: "error",
      error_message: message.slice(0, 2000),
    }).catch(() => {
      // Swallow: the original error matters more than logging fidelity.
    });
    return { ok: false, runId, message };
  }
}

/* --- sync_runs lifecycle --------------------------------------------- */

async function openSyncRun(): Promise<string | null> {
  const res = await supabaseRest<Array<{ id: string }>>("mercury_sync_runs", {
    method: "POST",
    body: JSON.stringify({ status: "running" }),
    prefer: "return=representation",
  });
  if (!res.ok) return null;
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return row?.id ?? null;
}

interface CloseSyncRunPatch {
  status: "ok" | "error";
  account_count?: number;
  transaction_count?: number;
  error_message?: string;
}

async function closeSyncRun(
  runId: string,
  patch: CloseSyncRunPatch,
): Promise<void> {
  await supabaseRest(
    `mercury_sync_runs?id=eq.${encodeURIComponent(runId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        ...patch,
        finished_at: new Date().toISOString(),
      }),
    },
  );
}

/* --- Accounts upsert -------------------------------------------------- */

async function upsertAccounts(accounts: MercuryAccount[]): Promise<void> {
  if (accounts.length === 0) return;

  const rows = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    kind: a.kind ?? null,
    // Mask server-side; the raw account number never lives in the DB.
    account_number_masked: maskAccountNumber(a.accountNumber),
    available_balance: a.availableBalance,
    current_balance: a.currentBalance,
    currency: a.currency,
    status: a.status ?? null,
    raw: a,
    updated_at: new Date().toISOString(),
  }));

  const res = await supabaseRest("mercury_accounts?on_conflict=id", {
    method: "POST",
    body: JSON.stringify(rows),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  if (!res.ok) {
    throw new Error(
      `Failed to upsert mercury_accounts: HTTP ${res.status} — ${res.detail.slice(0, 300)}`,
    );
  }
}

/* --- Transactions pull + upsert -------------------------------------- */

async function pullAccountTransactions(
  accountId: string,
  since: string,
): Promise<MercuryTransaction[]> {
  const all: MercuryTransaction[] = [];
  for (let page = 0; page < TX_MAX_PAGES; page++) {
    const { transactions } = await listAccountTransactions(accountId, {
      start: since,
      limit: TX_PAGE_SIZE,
      offset: page * TX_PAGE_SIZE,
    });
    all.push(...transactions);
    if (transactions.length < TX_PAGE_SIZE) break;
  }
  return all;
}

async function upsertTransactions(
  txs: MercuryTransaction[],
): Promise<number> {
  if (txs.length === 0) return 0;

  const rows = txs.map((t) => ({
    id: t.id,
    account_id: t.accountId ?? "",
    posted_at: t.postedAt ?? null,
    created_at: t.createdAt,
    amount: t.amount,
    kind: t.kind ?? null,
    counterparty_name: t.counterpartyName ?? null,
    counterparty_nickname: t.counterpartyNickname ?? null,
    bank_description: t.bankDescription ?? null,
    status: t.status,
    note: t.note ?? null,
    raw: t,
    updated_at: new Date().toISOString(),
  }));

  let written = 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const res = await supabaseRest("mercury_transactions?on_conflict=id", {
      method: "POST",
      body: JSON.stringify(chunk),
      prefer: "resolution=merge-duplicates,return=minimal",
    });
    if (!res.ok) {
      throw new Error(
        `Failed to upsert mercury_transactions: HTTP ${res.status} — ${res.detail.slice(0, 300)}`,
      );
    }
    written += chunk.length;
  }
  return written;
}

/* --- Error formatting ------------------------------------------------- */

function formatSyncError(err: unknown): string {
  if (err instanceof MercuryError) {
    return `Mercury ${err.status} on ${err.path}: ${err.detail.slice(0, 500)}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
