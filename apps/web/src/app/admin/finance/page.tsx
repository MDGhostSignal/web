"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  ErrorCard,
  Loading,
  Modal,
  PageHeader,
} from "@/components/admin";
import type {
  MercuryAccountRow,
  MercurySyncRunRow,
  MercuryTransactionRow,
} from "@/lib/mercury-types";

import { AccountCard } from "./components/AccountCard";
import {
  CashTrendChart,
  type CashTrendPoint,
} from "./components/CashTrendChart";
import { KpiRow } from "./components/KpiRow";
import { RefreshButton } from "./components/RefreshButton";
import { StaleBanner } from "./components/StaleBanner";
import { TransactionDetail } from "./components/TransactionDetail";
import { TransactionsTable } from "./components/TransactionsTable";
import styles from "./finance.module.css";

const TX_LIMIT = 50;
const TREND_DAYS = 90;

type TrendResponse = {
  ok: true;
  days: CashTrendPoint[];
  perAccount: Array<{
    accountId: string;
    series: Array<{ date: string; balance: string }>;
  }>;
};

type AccountsResponse = {
  ok: true;
  accounts: MercuryAccountRow[];
  lastSync: MercurySyncRunRow | null;
};

type TransactionsResponse = {
  ok: true;
  transactions: MercuryTransactionRow[];
  count: number;
  limit: number;
  offset: number;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

/**
 * /admin/finance — Mercury cash-monitoring dashboard.
 *
 * Data flow:
 *  - On mount: parallel GET /api/admin/finance/accounts + transactions.
 *  - Dashboard always reads from Supabase cache (the 15-min cron keeps
 *    it fresh). Mercury is never called from the browser.
 *  - "Refresh now": POST /api/admin/finance/sync, then re-fetch reads.
 *
 * Currency math: every amount is parsed with parseAmountCents into bigint
 * cents before any addition. No Number() calls on money strings anywhere.
 */
export default function FinancePage() {
  const [accounts, setAccounts] = useState<MercuryAccountRow[]>([]);
  const [transactions, setTransactions] = useState<MercuryTransactionRow[]>([]);
  const [trend, setTrend] = useState<CashTrendPoint[]>([]);
  const [sparklines, setSparklines] = useState<
    Map<string, Array<{ date: string; balance: string }>>
  >(new Map());
  const [lastSync, setLastSync] = useState<MercurySyncRunRow | null>(null);
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [aRes, tRes, trendRes] = await Promise.all([
        fetch("/api/admin/finance/accounts", { cache: "no-store" }),
        fetch(`/api/admin/finance/transactions?limit=${TX_LIMIT}`, {
          cache: "no-store",
        }),
        fetch(`/api/admin/finance/trend?days=${TREND_DAYS}`, {
          cache: "no-store",
        }),
      ]);

      if (!aRes.ok) {
        const detail = await aRes.text();
        throw new Error(`Accounts: HTTP ${aRes.status} — ${detail.slice(0, 200)}`);
      }
      if (!tRes.ok) {
        const detail = await tRes.text();
        throw new Error(
          `Transactions: HTTP ${tRes.status} — ${detail.slice(0, 200)}`,
        );
      }

      const aJson = (await aRes.json()) as AccountsResponse;
      const tJson = (await tRes.json()) as TransactionsResponse;

      setAccounts(aJson.accounts);
      setLastSync(aJson.lastSync);
      setTransactions(tJson.transactions);

      // Trend is non-blocking — render the dashboard even if it fails.
      if (trendRes.ok) {
        const trendJson = (await trendRes.json()) as TrendResponse;
        setTrend(trendJson.days);
        const map = new Map<string, Array<{ date: string; balance: string }>>();
        for (const entry of trendJson.perAccount) {
          map.set(entry.accountId, entry.series);
        }
        setSparklines(map);
      }

      setState({ kind: "ready" });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/finance/sync", {
        method: "POST",
        credentials: "include",
      });
      // Re-fetch reads regardless — if the sync errored, we still want
      // the latest mercury_sync_runs row so the banner updates.
      await loadData();
      if (!res.ok) {
        // Don't blow up the page — the banner reflects the error state
        // via the refreshed lastSync row. Body is intentionally ignored.
        await res.text().catch(() => "");
      }
    } finally {
      setRefreshing(false);
    }
  }, [loadData, refreshing]);

  const accountById = useMemo(() => {
    const map = new Map<string, MercuryAccountRow>();
    for (const a of accounts) map.set(a.id, a);
    return map;
  }, [accounts]);

  const selectedTx = useMemo(
    () => transactions.find((t) => t.id === selectedTxId) ?? null,
    [transactions, selectedTxId],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Finance"
        subtitle="Live Mercury account balances and recent transactions."
        actions={
          <RefreshButton
            lastSync={lastSync}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      />

      {state.kind === "loading" && <Loading message="Loading Mercury data…" />}

      {state.kind === "error" && (
        <ErrorCard title="Couldn't load finance data">
          <p>{state.message}</p>
          <p>
            <button
              type="button"
              onClick={() => {
                setState({ kind: "loading" });
                loadData();
              }}
            >
              Retry
            </button>
          </p>
        </ErrorCard>
      )}

      {state.kind === "ready" && (
        <>
          <StaleBanner lastSync={lastSync} />

          {accounts.length === 0 ? (
            <EmptyState
              title="No Mercury accounts cached yet"
              message={
                <>
                  Hit <strong>Refresh now</strong> to pull from Mercury, or wait
                  for the next 15-minute cron tick.
                </>
              }
            />
          ) : (
            <>
              <KpiRow accounts={accounts} transactions={transactions} />

              <section>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>Accounts</h2>
                  <span className={styles.sectionMeta}>
                    {accounts.length} account{accounts.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className={styles.accountsGrid}>
                  {accounts.map((a) => (
                    <AccountCard
                      key={a.id}
                      account={a}
                      sparklineSeries={sparklines.get(a.id)}
                    />
                  ))}
                </div>
              </section>

              {trend.length > 0 && (
                <section>
                  <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>
                      Cash position · last {TREND_DAYS} days
                    </h2>
                    <span className={styles.sectionMeta}>
                      consolidated across all accounts
                    </span>
                  </div>
                  <CashTrendChart
                    points={trend}
                    currency={accounts[0]?.currency ?? "USD"}
                  />
                </section>
              )}

              <section>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>Recent transactions</h2>
                  <span className={styles.sectionMeta}>
                    Latest {transactions.length}
                  </span>
                </div>
                {transactions.length === 0 ? (
                  <EmptyState
                    title="No transactions in the cache"
                    message="Either nothing has moved through Mercury recently or the first sync hasn't completed."
                  />
                ) : (
                  <TransactionsTable
                    transactions={transactions}
                    currency={accounts[0]?.currency ?? "USD"}
                    selectedId={selectedTxId}
                    onSelect={setSelectedTxId}
                  />
                )}
              </section>
            </>
          )}
        </>
      )}

      {selectedTx && (
        <Modal
          title="Transaction"
          open
          onClose={() => setSelectedTxId(null)}
        >
          <TransactionDetail
            transaction={selectedTx}
            account={accountById.get(selectedTx.account_id) ?? null}
          />
        </Modal>
      )}
    </div>
  );
}
