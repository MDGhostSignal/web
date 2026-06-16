"use client";

import { useEffect, useState } from "react";

import {
  Badge,
  Button,
  type Column,
  DataTable,
  EmptyState,
  ErrorPage,
  Loading,
  Modal,
  PageHeader,
  SearchInput,
  typeVariant,
} from "@/components/admin";

import { SubmissionDetail, type XQSubmissionLite } from "./SubmissionDetail";
import styles from "./xq-responses.module.css";

type StatusFilter = "all" | "incomplete" | "complete";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * /admin/xq-responses — Conviction Quotient submissions admin.
 *
 * Mirrors /admin/rq-responses in shape: DataTable with status filter +
 * search, expandable row → SubmissionDetail. Delete flow uses the
 * /api/xq-submissions/[id] DELETE endpoint with a confirmation modal.
 */
export default function XQResponsesPage() {
  const [submissions, setSubmissions] = useState<XQSubmissionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [confirmDelete, setConfirmDelete] = useState<XQSubmissionLite | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/xq-submissions/list");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setError(data.error || "Failed to fetch submissions");
          return;
        }
        setSubmissions(data.submissions ?? []);
      } catch {
        if (!cancelled) setError("Failed to connect to the server");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completeCount = submissions.filter(
    (s) => (s.status ?? "complete") === "complete",
  ).length;
  const incompleteCount = submissions.filter(
    (s) => (s.status ?? "complete") === "incomplete",
  ).length;

  const filtered = submissions.filter((s) => {
    const status = s.status ?? "complete";
    if (statusFilter !== "all" && status !== statusFilter) return false;
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.organization?.toLowerCase().includes(q) ||
      s.xq_code?.toLowerCase().includes(q) ||
      s.xq_archetype_name?.toLowerCase().includes(q)
    );
  });

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/xq-submissions/${encodeURIComponent(confirmDelete.id)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setDeleteError(data.error || "Failed to delete submission.");
        return;
      }
      setSubmissions((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      if (expandedRow === confirmDelete.id) setExpandedRow(null);
      setConfirmDelete(null);
    } catch {
      setDeleteError("Network error during delete.");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<XQSubmissionLite>[] = [
    {
      key: "date",
      header: "Date",
      variant: "muted",
      cell: (row) => (
        <span className={styles.date}>{formatDate(row.submitted_at)}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      variant: "nowrap",
      cell: (row) =>
        `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "—",
    },
    {
      key: "email",
      header: "Email",
      variant: "truncate",
      cell: (row) =>
        row.email ? (
          <a
            className={styles.email}
            href={`mailto:${row.email}`}
            onClick={(e) => e.stopPropagation()}
          >
            {row.email}
          </a>
        ) : (
          "—"
        ),
    },
    {
      key: "org",
      header: "Organization",
      variant: "truncate",
      cell: (row) => row.organization || "—",
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant={typeVariant(row.participant_type)}>
          {row.participant_type || "—"}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const s = row.status ?? "complete";
        return (
          <Badge variant={s === "complete" ? "success" : "warn"}>
            {s === "complete" ? "Complete" : "Incomplete"}
          </Badge>
        );
      },
    },
    {
      key: "archetype",
      header: "Archetype",
      variant: "nowrap",
      cell: (row) => (
        <span className={styles.archetypeCell}>
          <span className={styles.archetypeName}>
            {row.xq_archetype_name || "—"}
          </span>
          {row.xq_code && (
            <span className={styles.archetypeCode}>{row.xq_code}</span>
          )}
        </span>
      ),
    },
    {
      key: "expand",
      header: "",
      variant: "numeric",
      cell: (row) => (
        <span className={styles.expandGlyph}>
          {expandedRow === row.id ? "−" : "+"}
        </span>
      ),
    },
  ];

  if (loading) return <Loading message="Loading XQ submissions…" />;
  if (error) return <ErrorPage message={error} />;

  return (
    <div>
      <PageHeader
        title="XQ Submissions"
        subtitle="Conviction Quotient — strategic convictions and lived business values, scored archetype + four-bucket value blueprint per submission."
        count={
          <Badge variant="accent">
            {filtered.length}{" "}
            {filtered.length === 1 ? "submission" : "submissions"}
          </Badge>
        }
        toolbar={
          <div className={styles.toolbarRow}>
            <SearchInput
              placeholder="Search by name, email, organization, archetype, or code…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div
              className={styles.statusFilter}
              role="tablist"
              aria-label="Filter by status"
            >
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === "all"}
                className={`${styles.statusTab} ${statusFilter === "all" ? styles.statusTabActive : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                All{" "}
                <span className={styles.statusTabCount}>{submissions.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === "complete"}
                className={`${styles.statusTab} ${statusFilter === "complete" ? styles.statusTabActive : ""}`}
                onClick={() => setStatusFilter("complete")}
              >
                Complete{" "}
                <span className={styles.statusTabCount}>{completeCount}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === "incomplete"}
                className={`${styles.statusTab} ${statusFilter === "incomplete" ? styles.statusTabActive : ""}`}
                onClick={() => setStatusFilter("incomplete")}
              >
                Incomplete{" "}
                <span className={styles.statusTabCount}>{incompleteCount}</span>
              </button>
            </div>
          </div>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={
            submissions.length === 0
              ? "No XQ submissions yet"
              : "No submissions match your filter"
          }
          message={
            submissions.length === 0
              ? "Once people complete the public /xq-quiz, their dossiers will land here."
              : "Try clearing the search or switching the status filter."
          }
        />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          expandedRowId={expandedRow}
          onToggleRow={(id) =>
            setExpandedRow((curr) => (curr === id ? null : id))
          }
          renderExpanded={(row) => (
            <div className={styles.detailsBlock}>
              <div className={styles.detailsActions}>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(row);
                  }}
                >
                  Delete submission
                </Button>
              </div>
              <SubmissionDetail submission={row} />
            </div>
          )}
        />
      )}

      {confirmDelete && (
        <Modal
          open
          onClose={() => {
            if (!deleting) {
              setConfirmDelete(null);
              setDeleteError(null);
            }
          }}
          size="md"
          title="Delete XQ submission?"
          dismissible={!deleting}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </Button>
            </>
          }
        >
          <p className={styles.modalBody}>
            This permanently removes the submission for{" "}
            <strong>
              {confirmDelete.first_name} {confirmDelete.last_name}
            </strong>
            {confirmDelete.email && (
              <>
                {" "}
                (<code>{confirmDelete.email}</code>)
              </>
            )}
            . No undo.
          </p>
          {deleteError && (
            <p className={styles.modalError} role="alert">
              {deleteError}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
