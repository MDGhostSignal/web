import { PageHeader, Badge } from "@/components/admin";
import { supabaseRest } from "@/lib/supabase-admin";

import { RequestsTable } from "./RequestsTable";
import styles from "./page.module.css";

/** Admin page reading live Supabase state; no useful static output. */
export const dynamic = "force-dynamic";

/**
 * Intro Requests — members click "Request an intro" on a roster brand;
 * the team brokers the intro by hand (matching stays human). This is
 * the triage queue: new requests first, status flips inline.
 *
 * Tolerant of docs/STUDIO_LITE_CONTACT_REQUESTS.sql not having run
 * yet: the page renders a run-the-migration notice instead of rows.
 */
export default async function StudioRequestsPage() {
  const res = await supabaseRest<RequestRow[]>(
    "studio_contact_requests?" +
      "select=id,message,status,created_at," +
      "members(first_name,last_name,email,organization)," +
      "brands(name)&" +
      "order=created_at.desc",
  );

  // A failed read almost always means the table doesn't exist yet.
  const tableMissing = !res.ok && res.status === 404;
  const fetchError =
    !res.ok && !tableMissing
      ? `Load failed (${res.status}): ${res.detail.slice(0, 200)}`
      : null;

  const rows = res.ok ? res.data ?? [] : [];
  // Triage order: new first, then in-progress, then closed states —
  // newest first within each group (the query pre-sorts by date).
  const rank: Record<string, number> = { new: 0, in_progress: 1 };
  const sorted = [...rows].sort(
    (a, b) => (rank[a.status] ?? 2) - (rank[b.status] ?? 2),
  );
  const openCount = rows.filter(
    (r) => r.status === "new" || r.status === "in_progress",
  ).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Intro Requests"
        subtitle="Brokered-intro asks from Studio members toward roster brands. The team makes the connection by hand — flip the status as you work them."
        count={
          <Badge variant={openCount > 0 ? "warn" : "neutral"}>
            {openCount} open
          </Badge>
        }
      />

      {tableMissing && (
        <div className={styles.notice}>
          <strong>Migration pending.</strong> The requests table doesn&apos;t
          exist yet — run <code>docs/STUDIO_LITE_CONTACT_REQUESTS.sql</code> in
          the Supabase SQL editor, then reload. Until then members see a
          friendly error when they try to request an intro.
        </div>
      )}
      {fetchError && <div className={styles.error}>{fetchError}</div>}

      {!tableMissing && !fetchError && sorted.length === 0 ? (
        <div className={styles.empty}>
          <strong>No intro requests yet.</strong>
          <p>
            When a member asks for an intro from their roster, it lands here.
          </p>
        </div>
      ) : (
        sorted.length > 0 && <RequestsTable rows={sorted} />
      )}
    </div>
  );
}

export type RequestRow = {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
  members: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    organization: string | null;
  } | null;
  brands: { name: string | null } | null;
};
