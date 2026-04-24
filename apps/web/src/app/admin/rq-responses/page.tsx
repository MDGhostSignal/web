"use client";

import { useState, useEffect } from "react";

import {
  Badge,
  Button,
  clarityVariant,
  type Column,
  DataTable,
  DetailsActions,
  DetailsGrid,
  DetailsSection,
  EmptyState,
  ErrorCard,
  ErrorPage,
  Loading,
  Modal,
  PageHeader,
  SearchInput,
  typeVariant,
} from "@/components/admin";
import styles from "./rq-responses.module.css";

type Submission = {
  id: string;
  submitted_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  organization: string | null;
  role: string | null;
  industry: string | null;
  website: string | null;
  participant_type: string | null;
  rq_code: string | null;
  rq_name: string | null;
  signal_clarity_label: string | null;
  signal_clarity_note: string | null;
  profile_json: {
    values?: string;
    authenticity?: string;
    horizon?: string;
  } | null;
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RQDashboardPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Delete-flow state. `confirmDelete` holds the submission the user
  // tapped "Delete" on (null when the modal is closed). `deleting` is
  // true only while the DELETE request is in flight so we can disable
  // the confirm button and show a pending label. `deleteError` surfaces
  // API failures inside the modal rather than a disruptive alert().
  const [confirmDelete, setConfirmDelete] = useState<Submission | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const response = await fetch("/api/rq-submissions/list");
        const data = await response.json();
        if (!response.ok || !data.ok) {
          setError(data.error || "Failed to fetch submissions");
          return;
        }
        setSubmissions(data.submissions);
      } catch {
        setError("Failed to connect to the server");
      } finally {
        setLoading(false);
      }
    }
    fetchSubmissions();
  }, []);

  const filteredSubmissions = submissions.filter((sub) => {
    const search = searchTerm.toLowerCase();
    if (!search) return true;
    return (
      sub.first_name?.toLowerCase().includes(search) ||
      sub.last_name?.toLowerCase().includes(search) ||
      sub.email?.toLowerCase().includes(search) ||
      sub.organization?.toLowerCase().includes(search) ||
      sub.rq_code?.toLowerCase().includes(search) ||
      sub.rq_name?.toLowerCase().includes(search)
    );
  });

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/rq-submissions/${confirmDelete.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setDeleteError(data.error || "Failed to delete submission.");
        return;
      }
      const deletedId = confirmDelete.id;
      setSubmissions((rows) => rows.filter((r) => r.id !== deletedId));
      if (expandedRow === deletedId) setExpandedRow(null);
      setConfirmDelete(null);
    } catch {
      setDeleteError("Failed to connect to the server.");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Submission>[] = [
    {
      key: "date",
      header: "Date",
      variant: "muted",
      cell: (row) => <span className={styles.date}>{formatDate(row.submitted_at)}</span>,
    },
    {
      key: "name",
      header: "Name",
      variant: "nowrap",
      cell: (row) => `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "—",
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
      key: "code",
      header: "RQ Code",
      variant: "mono",
      cell: (row) => row.rq_code || "—",
    },
    {
      key: "clarity",
      header: "Clarity",
      cell: (row) => (
        <Badge variant={clarityVariant(row.signal_clarity_label)}>
          {row.signal_clarity_label || "—"}
        </Badge>
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

  if (loading) {
    return <Loading message="Loading submissions…" />;
  }

  if (error) {
    return <ErrorPage message={error} />;
  }

  return (
    <>
      <div>
        <PageHeader
          title="RQ Submissions"
          count={
            <Badge variant="accent">
              {filteredSubmissions.length}{" "}
              {filteredSubmissions.length === 1 ? "submission" : "submissions"}
            </Badge>
          }
          toolbar={
            <SearchInput
              placeholder="Search by name, email, organization, or RQ code…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          }
        />

        {filteredSubmissions.length === 0 ? (
          <EmptyState
            title="No submissions found"
            message={
              searchTerm
                ? "Try a different search term, or clear the filter."
                : "New RQ quiz submissions will appear here."
            }
          />
        ) : (
          <DataTable
            rows={filteredSubmissions}
            columns={columns}
            expandedRowId={expandedRow}
            onToggleRow={(id) =>
              setExpandedRow(expandedRow === id ? null : id)
            }
            renderExpanded={(sub) => (
              <>
                <DetailsGrid>
                  <DetailsSection title="Contact Information">
                    <p>
                      <strong>Role:</strong> {sub.role || "—"}
                    </p>
                    <p>
                      <strong>Industry:</strong> {sub.industry || "—"}
                    </p>
                    <p>
                      <strong>Website:</strong>{" "}
                      {sub.website ? (
                        <a
                          href={sub.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {sub.website}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                  </DetailsSection>
                  <DetailsSection title="RQ Results">
                    <p>
                      <strong>RQ Name:</strong> {sub.rq_name || "—"}
                    </p>
                    <p>
                      <strong>Clarity Note:</strong>{" "}
                      {sub.signal_clarity_note || "—"}
                    </p>
                  </DetailsSection>
                </DetailsGrid>

                {sub.profile_json && (
                  <div className={styles.profileBlock}>
                    <h4 className={styles.profileHeading}>Profile Analysis</h4>
                    <div className={styles.profileGrid}>
                      {sub.profile_json.values && (
                        <div className={styles.profileItem}>
                          <h5>Values</h5>
                          <p>{sub.profile_json.values}</p>
                        </div>
                      )}
                      {sub.profile_json.authenticity && (
                        <div className={styles.profileItem}>
                          <h5>Authenticity</h5>
                          <p>{sub.profile_json.authenticity}</p>
                        </div>
                      )}
                      {sub.profile_json.horizon && (
                        <div className={styles.profileItem}>
                          <h5>Horizon</h5>
                          <p>{sub.profile_json.horizon}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <DetailsActions>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteError(null);
                      setConfirmDelete(sub);
                    }}
                  >
                    Delete entry
                  </Button>
                </DetailsActions>
              </>
            )}
          />
        )}
      </div>

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        dismissible={!deleting}
        size="sm"
        title="Delete this submission?"
        subtitle="This action cannot be undone."
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
              variant="destructiveSolid"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
          </>
        }
      >
        <p>
          This will permanently remove{" "}
          <strong>
            {confirmDelete?.first_name} {confirmDelete?.last_name}
          </strong>
          &rsquo;s submission
          {confirmDelete?.rq_code ? ` (${confirmDelete.rq_code})` : ""} from
          the database.
        </p>
        {deleteError && <ErrorCard>{deleteError}</ErrorCard>}
      </Modal>
    </>
  );
}
