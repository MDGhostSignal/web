"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge, type BadgeVariant } from "@/components/admin";

import type { RequestRow } from "./page";
import styles from "./page.module.css";

const STATUSES = ["new", "in_progress", "done", "declined"] as const;

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  in_progress: "In progress",
  done: "Done",
  declined: "Declined",
};

function statusVariant(status: string): BadgeVariant {
  if (status === "new") return "warn";
  if (status === "in_progress") return "info";
  if (status === "done") return "success";
  if (status === "declined") return "neutral";
  return "neutral";
}

/** Triage table: one row per request, inline status select. The row
 *  PATCHes immediately on change; the badge reflects the saved state. */
export function RequestsTable({ rows }: { rows: RequestRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/admin/studio/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Update failed (${res.status}).`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Wants intro to</th>
              <th>Message</th>
              <th>Requested</th>
              <th>Status</th>
              <th className={styles.actionCol}>Set status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const m = r.members;
              const memberName =
                `${m?.first_name ?? ""} ${m?.last_name ?? ""}`.trim() ||
                m?.email ||
                "(unknown member)";
              return (
                <tr key={r.id}>
                  <td>
                    <span className={styles.memberCell}>
                      <span>{memberName}</span>
                      <span className={styles.dim}>
                        {m?.organization ?? m?.email ?? "—"}
                      </span>
                    </span>
                  </td>
                  <td className={styles.brandCell}>
                    {r.brands?.name ?? "(unknown brand)"}
                  </td>
                  <td className={styles.messageCell}>
                    {r.message ? (
                      <span title={r.message}>{r.message}</span>
                    ) : (
                      <span className={styles.dim}>—</span>
                    )}
                  </td>
                  <td className={styles.dim}>{relativeDate(r.created_at)}</td>
                  <td>
                    <Badge variant={statusVariant(r.status)}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </td>
                  <td className={styles.actionCol}>
                    <select
                      className={styles.statusSelect}
                      value={r.status}
                      disabled={pendingId === r.id}
                      onChange={(e) => setStatus(r.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 14) return `${day} day${day === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString();
}
