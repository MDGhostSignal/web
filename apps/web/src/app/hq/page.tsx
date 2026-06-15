"use client";

import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/admin";
import type {
  MercuryAccountRow,
  MercurySyncRunRow,
  MercuryTransactionRow,
} from "@/lib/mercury-types";
import {
  formatCents,
  formatRelativeTimePast,
  parseAmountCents,
  sumAmountsCents,
} from "@/lib/mercury-types";
import { MEMBER_PHASE_LABELS, type Member, type MemberPhase } from "@/lib/members";
import type { SocialPostRow } from "@/lib/social-posts-types";

import { HomeKpiCard } from "./components/HomeKpiCard";
import styles from "./admin-home.module.css";

type LoadState<T> =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: T };

const BIGINT_ZERO = BigInt(0);
const DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * DAY_MS;

/**
 * /admin — Dashboard home. Three KPI cards that aggregate data from
 * the rest of the admin: Mercury cash position, due social posts,
 * lead pipeline counts. No new API endpoints — each card uses an
 * existing route and renders independently (one card erroring
 * doesn't block the others).
 */
export default function AdminHome() {
  const [finance, setFinance] = useState<
    LoadState<{
      accounts: MercuryAccountRow[];
      transactions: MercuryTransactionRow[];
      lastSync: MercurySyncRunRow | null;
    }>
  >({ kind: "loading" });

  const [social, setSocial] = useState<LoadState<SocialPostRow[]>>({
    kind: "loading",
  });

  const [leads, setLeads] = useState<LoadState<Member[]>>({ kind: "loading" });

  const [art19, setArt19] = useState<
    LoadState<{
      showCount: number;
      episodeCount: number;
      lastSync: { started_at: string; status: string } | null;
      listens30d: { total: number; hasData: boolean };
    }>
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    // Finance: parallel pulls — accounts (for total cash + last sync)
    // and transactions (for 30-day net flow).
    (async () => {
      try {
        const [aRes, tRes] = await Promise.all([
          fetch("/api/admin/finance/accounts", { cache: "no-store" }),
          fetch("/api/admin/finance/transactions?limit=500", {
            cache: "no-store",
          }),
        ]);
        if (!aRes.ok) throw new Error(`Accounts HTTP ${aRes.status}`);
        if (!tRes.ok) throw new Error(`Transactions HTTP ${tRes.status}`);
        const aJson = (await aRes.json()) as {
          accounts: MercuryAccountRow[];
          lastSync: MercurySyncRunRow | null;
        };
        const tJson = (await tRes.json()) as {
          transactions: MercuryTransactionRow[];
        };
        if (!cancelled) {
          setFinance({
            kind: "ready",
            data: {
              accounts: aJson.accounts,
              transactions: tJson.transactions,
              lastSync: aJson.lastSync,
            },
          });
        }
      } catch (err) {
        if (!cancelled) {
          setFinance({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();

    // Social: posts scheduled in the next 48 hours.
    (async () => {
      try {
        const now = Date.now();
        const from = new Date(now).toISOString();
        const to = new Date(now + 2 * DAY_MS).toISOString();
        const res = await fetch(
          `/api/admin/marketing-social?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&status=scheduled&limit=50`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { posts: SocialPostRow[] };
        if (!cancelled) setSocial({ kind: "ready", data: json.posts });
      } catch (err) {
        if (!cancelled) {
          setSocial({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();

    // Leads: full members list (PostgREST hard cap 1000).
    (async () => {
      try {
        const res = await fetch("/api/members", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { members: Member[] };
        if (!cancelled) setLeads({ kind: "ready", data: json.members });
      } catch (err) {
        if (!cancelled) {
          setLeads({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();

    // ART19: cached show + episode counts + last 30d listens. When
    // the listens endpoint returns hasData=false (no rows in
    // art19_listens_daily yet, e.g. before Support confirms the
    // metrics API surface), the card renders episode count as the
    // headline. Once data lands the headline auto-swaps to listens.
    (async () => {
      try {
        const [sRes, lRes] = await Promise.all([
          fetch("/api/admin/art19/summary", { cache: "no-store" }),
          fetch("/api/admin/art19/listens?range=30d", { cache: "no-store" }),
        ]);
        if (!sRes.ok) throw new Error(`Summary HTTP ${sRes.status}`);
        const sJson = (await sRes.json()) as {
          showCount: number;
          episodeCount: number;
          lastSync: { started_at: string; status: string } | null;
        };
        const lJson = lRes.ok
          ? ((await lRes.json()) as { total: number; hasData: boolean })
          : { total: 0, hasData: false };
        if (!cancelled) {
          setArt19({
            kind: "ready",
            data: {
              showCount: sJson.showCount,
              episodeCount: sJson.episodeCount,
              lastSync: sJson.lastSync,
              listens30d: { total: lJson.total, hasData: lJson.hasData },
            },
          });
        }
      } catch (err) {
        if (!cancelled) {
          setArt19({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* --- Finance KPI computation ----------------------------------- */

  const financeView = useMemo(() => {
    if (finance.kind !== "ready") return null;
    const { accounts, transactions, lastSync } = finance.data;
    const currency = accounts[0]?.currency ?? "USD";
    const total = sumAmountsCents(accounts.map((a) => a.available_balance));
    const since = Date.now() - THIRTY_DAYS_MS;
    let net = BIGINT_ZERO;
    for (const t of transactions) {
      const iso = t.posted_at ?? t.created_at;
      if (!iso) continue;
      const ts = new Date(iso).getTime();
      if (!Number.isFinite(ts) || ts < since) continue;
      net += parseAmountCents(t.amount);
    }
    const lastSyncIso =
      lastSync?.finished_at ?? lastSync?.started_at ?? null;
    return {
      total,
      net,
      netPositive: net > BIGINT_ZERO,
      currency,
      accountCount: accounts.length,
      lastSyncedRelative: formatRelativeTimePast(lastSyncIso),
    };
  }, [finance]);

  /* --- Leads breakdown ------------------------------------------- */

  const leadsView = useMemo(() => {
    if (leads.kind !== "ready") return null;
    const counts: Partial<Record<MemberPhase, number>> = {};
    for (const m of leads.data) {
      if (!m.phase) continue;
      counts[m.phase] = (counts[m.phase] ?? 0) + 1;
    }
    const total = leads.data.length;
    const active = total - (counts.churned ?? 0) - (counts.paused ?? 0);
    return { counts, total, active };
  }, [leads]);

  /* --- Render ---------------------------------------------------- */

  return (
    <div className={styles.page}>
      <PageHeader
        title="Dashboard"
        subtitle="Today at GhostSignal — cash, posts, pipeline at a glance."
      />

      <div className={styles.grid}>
        {/* Finance card */}
        <HomeKpiCard
          label="Total cash"
          href="/hq/finance"
          state={
            finance.kind === "loading"
              ? "loading"
              : finance.kind === "error"
                ? "error"
                : "ready"
          }
          errorMessage={
            finance.kind === "error" ? finance.message : undefined
          }
          value={
            financeView ? formatCents(financeView.total, financeView.currency) : ""
          }
          sub={
            financeView ? (
              <>
                across {financeView.accountCount} account
                {financeView.accountCount === 1 ? "" : "s"} ·{" "}
                <span className={styles.cardSubDim}>
                  synced {financeView.lastSyncedRelative}
                </span>
              </>
            ) : null
          }
          body={
            financeView ? (
              <div className={styles.financeNet}>
                <span className={styles.financeNetLabel}>30-day net flow</span>
                <span
                  className={
                    financeView.netPositive
                      ? styles.financeNetPositive
                      : styles.financeNetNeutral
                  }
                >
                  {financeView.netPositive ? "+" : ""}
                  {formatCents(financeView.net, financeView.currency)}
                </span>
              </div>
            ) : null
          }
        />

        {/* Social card */}
        <HomeKpiCard
          label="Social posts due"
          href="/hq/marketing/social"
          state={
            social.kind === "loading"
              ? "loading"
              : social.kind === "error"
                ? "error"
                : "ready"
          }
          errorMessage={
            social.kind === "error" ? social.message : undefined
          }
          value={social.kind === "ready" ? social.data.length : 0}
          sub={
            social.kind === "ready"
              ? social.data.length === 0
                ? "Nothing in the next 48 hours."
                : `Next 48 hours · ${social.data.length === 1 ? "1 post" : `${social.data.length} posts`}`
              : null
          }
          body={
            social.kind === "ready" && social.data.length > 0 ? (
              <ul className={styles.dueList}>
                {social.data.slice(0, 3).map((p) => (
                  <li key={p.id} className={styles.dueListItem}>
                    <span className={styles.dueListWhen}>
                      {formatDueTime(p.scheduled_at)}
                    </span>
                    <span className={styles.dueListTitle}>
                      {p.title?.trim() ||
                        p.body.split("\n")[0].slice(0, 60) ||
                        "(untitled)"}
                    </span>
                  </li>
                ))}
                {social.data.length > 3 && (
                  <li className={styles.dueListMore}>
                    + {social.data.length - 3} more…
                  </li>
                )}
              </ul>
            ) : null
          }
        />

        {/* ART19 card — primary KPI here is episode count today; the
            "Listens · last 30d" line is the headline metric the user
            asked for, currently a placeholder until ART19 Support
            confirms the metrics API surface (see
            docs/ART19_INTEGRATION.md → Known gaps). Once that lands
            we swap the value in without restructuring the card. */}
        <HomeKpiCard
          label="ART19 network"
          href="/hq/art19"
          state={
            art19.kind === "loading"
              ? "loading"
              : art19.kind === "error"
                ? "error"
                : "ready"
          }
          errorMessage={art19.kind === "error" ? art19.message : undefined}
          value={
            art19.kind === "ready"
              ? art19.data.listens30d.hasData
                ? formatArt19Listens(art19.data.listens30d.total)
                : art19.data.episodeCount
              : 0
          }
          sub={
            art19.kind === "ready" ? (
              <>
                {art19.data.listens30d.hasData
                  ? "listens · last 30 days"
                  : `${art19.data.episodeCount === 1 ? "episode" : "episodes"} across ${art19.data.showCount} ${art19.data.showCount === 1 ? "show" : "shows"}`}
                {art19.data.lastSync?.started_at && (
                  <>
                    {" · "}
                    <span className={styles.cardSubDim}>
                      synced {formatRelativeTimePast(art19.data.lastSync.started_at)}
                    </span>
                  </>
                )}
              </>
            ) : null
          }
          body={
            art19.kind === "ready" ? (
              <div className={styles.financeNet}>
                <span className={styles.financeNetLabel}>
                  {art19.data.listens30d.hasData
                    ? "Shows / episodes"
                    : "Listens · last 30 days"}
                </span>
                <span className={styles.financeNetNeutral}>
                  {art19.data.listens30d.hasData
                    ? `${art19.data.showCount} shows · ${art19.data.episodeCount} episodes`
                    : "pending ART19 metrics access"}
                </span>
              </div>
            ) : null
          }
        />

        {/* Contacts card */}
        <HomeKpiCard
          label="Contact pipeline"
          href="/hq/contacts"
          state={
            leads.kind === "loading"
              ? "loading"
              : leads.kind === "error"
                ? "error"
                : "ready"
          }
          errorMessage={leads.kind === "error" ? leads.message : undefined}
          value={leadsView?.active ?? 0}
          sub={
            leadsView
              ? `${leadsView.active} active · ${leadsView.total} total`
              : null
          }
          body={
            leadsView ? (
              <div className={styles.phaseGrid}>
                {(
                  [
                    "discern",
                    "court",
                    "sign",
                    "onboard",
                    "run",
                  ] as MemberPhase[]
                ).map((p) => (
                  <div key={p} className={styles.phaseChip}>
                    <span className={styles.phaseLabel}>
                      {MEMBER_PHASE_LABELS[p]}
                    </span>
                    <span className={styles.phaseCount}>
                      {leadsView.counts[p] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}

/** Pretty-print large listen counts (1.2M / 845K / 230). Used by the
 *  ART19 KPI card so a value of 1,234,567 renders as "1.2M" instead
 *  of overflowing the card width. */
function formatArt19Listens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDueTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Today ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
