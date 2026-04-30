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
import { RQResultsGraph } from "@/components/rq/RQResultsGraph";
import type { RQResult } from "@/lib/rq/scoring";
import styles from "./rq-responses.module.css";

type AxisDetail = {
  letter?: string | null;
  score?: number | null;
  band?: string | null;
};

type SubmissionStatus = "incomplete" | "complete";

type Submission = {
  id: string;
  submitted_at: string;
  status: SubmissionStatus | null;
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
  details_json: {
    values?: AxisDetail;
    authenticity?: AxisDetail;
    horizon?: AxisDetail;
  } | null;
  answers_json: Record<string, unknown> | null;
};

type StatusFilter = "all" | SubmissionStatus;

/** Human-readable label for each quiz answer key. Mirrors the question
 *  labels in apps/web/src/app/rq-quiz/page.tsx. Kept inline rather than
 *  extracted to a shared module — the list is short, stable, and only
 *  needed in two places. */
const QUESTION_LABELS: Record<string, string> = {
  VO1: "How explicitly do you communicate your core values in public-facing messaging?",
  VO2: "How important is it that your audience clearly understands your worldview or moral framework?",
  VO3: "Have you ever declined revenue or an opportunity because it conflicted with your values?",
  VO4: "When you describe your mission, it is usually…",
  VO5: "I'm comfortable being clearly identified with a set of convictions, even if it narrows the audience.",
  AE1: "When explaining what you stand for, what feels most natural?",
  AE2: "Our voice is primarily… (1=personal/conversational, 10=structured/intentional)",
  AE3: "A partnership message feels most authentic when it is…",
  AE4: "How important is tonal consistency across your content or brand?",
  AE5: "If an endorsement disrupted your usual tone, how uncomfortable would that feel?",
  FH1: "Partnerships should develop…",
  FH2: "How important is long-term continuity vs short-term impact? (1=short-term, 10=long-term)",
  FH3: "I prefer…",
  FH4: "Success in collaboration looks like…",
  FH5: "How patient are you with slower growth if alignment is strong?",
  U1: "Anything else they wanted to share",
};

const ANSWER_GROUPS: Array<{ title: string; keys: string[] }> = [
  { title: "Values Orientation", keys: ["VO1", "VO2", "VO3", "VO4", "VO5"] },
  { title: "Authenticity Expression", keys: ["AE1", "AE2", "AE3", "AE4", "AE5"] },
  { title: "Flourishing Horizon", keys: ["FH1", "FH2", "FH3", "FH4", "FH5"] },
  { title: "Undertone", keys: ["U1"] },
];

function bandLabel(score: number): string {
  return score <= 3 ? "1\u20133" : score <= 6 ? "4\u20136" : "7\u201310";
}

/** Reconstruct the per-axis details from rq_code when details_json is
 *  missing. Format: "F(8)-S(6)-L(9)". Older rows pre-dated the
 *  details_json column being populated, so this fallback keeps the
 *  graph rendering for them too. */
function parseRqCode(code: string | null): RQResult["details"] | null {
  if (!code) return null;
  const m = code.match(/^([FI])\((\d+)\)-([RS])\((\d+)\)-([LC])\((\d+)\)$/);
  if (!m) return null;
  const v = Number(m[2]);
  const a = Number(m[4]);
  const h = Number(m[6]);
  return {
    values: { letter: m[1], score: v, band: bandLabel(v) },
    authenticity: { letter: m[3], score: a, band: bandLabel(a) },
    horizon: { letter: m[5], score: h, band: bandLabel(h) },
  };
}

function buildRQResult(sub: Submission): RQResult | null {
  const stored = sub.details_json;
  const hasStored =
    stored &&
    stored.values?.letter &&
    typeof stored.values?.score === "number" &&
    stored.authenticity?.letter &&
    typeof stored.authenticity?.score === "number" &&
    stored.horizon?.letter &&
    typeof stored.horizon?.score === "number";

  const details: RQResult["details"] | null = hasStored
    ? {
        values: {
          letter: stored!.values!.letter as string,
          score: stored!.values!.score as number,
          band: stored!.values!.band ?? bandLabel(stored!.values!.score as number),
        },
        authenticity: {
          letter: stored!.authenticity!.letter as string,
          score: stored!.authenticity!.score as number,
          band:
            stored!.authenticity!.band ??
            bandLabel(stored!.authenticity!.score as number),
        },
        horizon: {
          letter: stored!.horizon!.letter as string,
          score: stored!.horizon!.score as number,
          band: stored!.horizon!.band ?? bandLabel(stored!.horizon!.score as number),
        },
      }
    : parseRqCode(sub.rq_code);

  if (!details) return null;

  const profile = {
    values: sub.profile_json?.values ?? "",
    authenticity: sub.profile_json?.authenticity ?? "",
    horizon: sub.profile_json?.horizon ?? "",
  };

  return {
    rq: sub.rq_code ?? "",
    rqName: sub.rq_name ?? "",
    details,
    profile,
  };
}

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

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
    // Older rows (pre-2026-04-30) have no status column populated;
    // treat null as 'complete' so they keep showing up in the
    // default view.
    const effectiveStatus: SubmissionStatus = sub.status ?? "complete";
    if (statusFilter !== "all" && effectiveStatus !== statusFilter) {
      return false;
    }

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

  const incompleteCount = submissions.filter(
    (s) => (s.status ?? "complete") === "incomplete",
  ).length;
  const completeCount = submissions.length - incompleteCount;

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
      key: "status",
      header: "Status",
      cell: (row) => {
        const s: SubmissionStatus = row.status ?? "complete";
        return (
          <Badge variant={s === "complete" ? "success" : "warn"}>
            {s === "complete" ? "Complete" : "Incomplete"}
          </Badge>
        );
      },
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
            <div className={styles.toolbarRow}>
              <SearchInput
                placeholder="Search by name, email, organization, or RQ code…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className={styles.statusFilter} role="tablist" aria-label="Filter by status">
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "all"}
                  className={`${styles.statusTab} ${statusFilter === "all" ? styles.statusTabActive : ""}`}
                  onClick={() => setStatusFilter("all")}
                >
                  All <span className={styles.statusTabCount}>{submissions.length}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "complete"}
                  className={`${styles.statusTab} ${statusFilter === "complete" ? styles.statusTabActive : ""}`}
                  onClick={() => setStatusFilter("complete")}
                >
                  Complete <span className={styles.statusTabCount}>{completeCount}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === "incomplete"}
                  className={`${styles.statusTab} ${statusFilter === "incomplete" ? styles.statusTabActive : ""}`}
                  onClick={() => setStatusFilter("incomplete")}
                >
                  Incomplete <span className={styles.statusTabCount}>{incompleteCount}</span>
                </button>
              </div>
            </div>
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
            renderExpanded={(sub) => {
              const rqResult = buildRQResult(sub);
              const answers = sub.answers_json ?? {};
              return (
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
                      <strong>RQ Code:</strong>{" "}
                      <span className={styles.rqCode}>{sub.rq_code || "—"}</span>
                    </p>
                    <p>
                      <strong>RQ Name:</strong> {sub.rq_name || "—"}
                    </p>
                    <p>
                      <strong>Clarity:</strong>{" "}
                      {sub.signal_clarity_label || "—"}
                      {sub.signal_clarity_note ? (
                        <span className={styles.clarityNote}>
                          {" "}— {sub.signal_clarity_note}
                        </span>
                      ) : null}
                    </p>
                  </DetailsSection>
                </DetailsGrid>

                {rqResult && (
                  <div className={styles.graphBlock}>
                    <h4 className={styles.sectionHeading}>Signal Profile</h4>
                    <div className={styles.graphScope}>
                      <RQResultsGraph result={rqResult} />
                    </div>
                  </div>
                )}

                {Object.keys(answers).length > 0 && (
                  <div className={styles.answersBlock}>
                    <h4 className={styles.sectionHeading}>Their Answers</h4>
                    {ANSWER_GROUPS.map((group) => {
                      const rows = group.keys
                        .map((key) => ({
                          key,
                          label: QUESTION_LABELS[key] ?? key,
                          value: answers[key],
                        }))
                        .filter(
                          (r) =>
                            r.value !== undefined &&
                            r.value !== null &&
                            r.value !== "",
                        );
                      if (rows.length === 0) return null;
                      return (
                        <section
                          key={group.title}
                          className={styles.answerGroup}
                        >
                          <h5 className={styles.answerGroupTitle}>
                            {group.title}
                          </h5>
                          <dl className={styles.answerList}>
                            {rows.map((row) => (
                              <div key={row.key} className={styles.answerRow}>
                                <dt className={styles.answerLabel}>
                                  <span className={styles.answerKey}>
                                    {row.key}
                                  </span>
                                  {row.label}
                                </dt>
                                <dd className={styles.answerValue}>
                                  {formatAnswer(row.value)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      );
                    })}
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
              );
            }}
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
