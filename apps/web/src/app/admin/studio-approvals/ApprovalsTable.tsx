"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/admin";
import { ARCHETYPES } from "@/lib/xq/constants";

import type { PendingRow } from "./page";
import styles from "./page.module.css";

/** members.xq_archetype holds the XQ *code* — show the archetype *name*. */
function xqArchetypeName(code: string | null): string | null {
  if (!code) return null;
  return (ARCHETYPES as Record<string, { name: string }>)[code]?.name ?? code;
}

/** Pending registrations table. Each row shows the registrant +
 *  their organization + an Approve button. After approve, the row
 *  vanishes from this view (the server query filters
 *  activated_at=is.null). */
export function ApprovalsTable({ rows }: { rows: PendingRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approve(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch("/api/admin/studio/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Approve failed (${res.status}).`);
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
              <th>Name</th>
              <th>Email</th>
              <th>Organization</th>
              <th>Kind</th>
              <th>XQ</th>
              <th>Registered</th>
              <th className={styles.actionCol}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const displayName =
                `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() ||
                "(unnamed)";
              return (
                <tr key={r.id}>
                  <td>{displayName}</td>
                  <td>{r.email ?? "—"}</td>
                  <td>{r.organization ?? "—"}</td>
                  <td>
                    <Badge
                      variant={
                        r.member_type === "creator"
                          ? "info"
                          : r.member_type === "brand"
                          ? "accent"
                          : "neutral"
                      }
                    >
                      {r.member_type}
                    </Badge>
                  </td>
                  <td>{xqArchetypeName(r.xq_archetype) ?? "—"}</td>
                  <td className={styles.dim}>{relativeDate(r.created_at)}</td>
                  <td className={styles.actionCol}>
                    <button
                      type="button"
                      className={styles.approveBtn}
                      onClick={() => approve(r.id)}
                      disabled={pendingId === r.id}
                    >
                      {pendingId === r.id ? "Approving…" : "Approve"}
                    </button>
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
