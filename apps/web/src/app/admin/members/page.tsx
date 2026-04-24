"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Badge,
  type BadgeVariant,
  Button,
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
import {
  countCompleted,
  daysSince,
  LIFECYCLE_STEPS,
  MEMBER_OWNERS,
  MEMBER_PHASE_LABELS,
  MEMBER_PHASES,
  MEMBER_TYPE_LABELS,
  MEMBER_TYPES,
  ROT_THRESHOLD_DAYS,
  type LifecycleStepDef,
  type LifecycleSteps,
  type Member,
  type MemberPhase,
  type MemberType,
  type MemberWritable,
  type StepStatus,
} from "@/lib/members";

import styles from "./members.module.css";

/* =====================================================================
 * Helpers
 * ===================================================================== */

function phaseVariant(phase: MemberPhase): BadgeVariant {
  switch (phase) {
    case "discern":
      return "info";
    case "court":
      return "accent";
    case "sign":
      return "warn";
    case "onboard":
      return "warn";
    case "run":
      return "success";
    case "paused":
      return "neutral";
    case "churned":
      return "danger";
  }
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fullName(m: Member): string {
  const first = m.first_name ?? "";
  const last = m.last_name ?? "";
  return `${first} ${last}`.trim() || "—";
}

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  member_type: MemberType;
  organization: string;
  role: string;
  website: string;
  phase: MemberPhase;
  owner: string;
  next_step: string;
  last_contact_at: string;
  notes: string;
  tagsCsv: string;
};

const EMPTY_FORM: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  member_type: "creator",
  organization: "",
  role: "",
  website: "",
  phase: "discern",
  owner: "",
  next_step: "",
  last_contact_at: "",
  notes: "",
  tagsCsv: "",
};

function memberToForm(m: Member): FormState {
  return {
    first_name: m.first_name ?? "",
    last_name: m.last_name ?? "",
    email: m.email ?? "",
    phone: m.phone ?? "",
    member_type: m.member_type,
    organization: m.organization ?? "",
    role: m.role ?? "",
    website: m.website ?? "",
    phase: m.phase,
    owner: m.owner ?? "",
    next_step: m.next_step ?? "",
    last_contact_at: m.last_contact_at ? m.last_contact_at.slice(0, 10) : "",
    notes: m.notes ?? "",
    tagsCsv: m.tags.join(", "),
  };
}

function formToPayload(f: FormState): MemberWritable {
  return {
    first_name: f.first_name.trim() || null,
    last_name: f.last_name.trim() || null,
    email: f.email.trim() || null,
    phone: f.phone.trim() || null,
    member_type: f.member_type,
    organization: f.organization.trim() || null,
    role: f.role.trim() || null,
    website: f.website.trim() || null,
    phase: f.phase,
    owner: f.owner.trim() || null,
    next_step: f.next_step.trim() || null,
    last_contact_at: f.last_contact_at ? f.last_contact_at : null,
    notes: f.notes.trim() || null,
    tags: f.tagsCsv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
  };
}

/* =====================================================================
 * Page
 * ===================================================================== */

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterPhase, setFilterPhase] = useState<MemberPhase | "all">("all");
  const [filterType, setFilterType] = useState<MemberType | "all">("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");

  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/members");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setError(data.error || "Failed to load members.");
          return;
        }
        setMembers(data.members as Member[]);
      } catch {
        if (!cancelled) setError("Failed to connect to the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreateModal = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((m: Member) => {
    setEditingId(m.id);
    setForm(memberToForm(m));
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, [isSaving]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSaving) return;

      const payload = formToPayload(form);
      const hasIdentifier =
        (payload.first_name && payload.first_name.length > 0) ||
        (payload.last_name && payload.last_name.length > 0) ||
        (payload.organization && payload.organization.length > 0);
      if (!hasIdentifier) {
        setError("Add a first name, last name, or organization.");
        return;
      }

      setIsSaving(true);
      setError(null);

      try {
        const url = editingId ? `/api/members/${editingId}` : "/api/members";
        const method = editingId ? "PATCH" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || "Save failed.");
          return;
        }
        const saved = data.member as Member;
        setMembers((prev) =>
          editingId
            ? prev.map((m) => (m.id === editingId ? saved : m))
            : [saved, ...prev],
        );
        setIsModalOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
      } catch {
        setError("Failed to connect to the server.");
      } finally {
        setIsSaving(false);
      }
    },
    [form, editingId, isSaving],
  );

  const handleStepToggle = useCallback(
    async (
      memberId: string,
      stepKey: string,
      nextStatus: StepStatus,
    ) => {
      const current = members.find((m) => m.id === memberId);
      if (!current) return;

      const today = new Date().toISOString().slice(0, 10);
      const nextState = {
        status: nextStatus,
        completed_at:
          nextStatus === "done"
            ? (current.lifecycle_steps?.[stepKey]?.completed_at ?? today)
            : null,
      };
      const merged: LifecycleSteps = {
        ...(current.lifecycle_steps ?? {}),
        [stepKey]: nextState,
      };

      // Optimistic update — roll back on failure.
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, lifecycle_steps: merged } : m,
        ),
      );

      try {
        const res = await fetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lifecycle_steps: merged }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setError(data.error || "Failed to save step.");
          setMembers((prev) =>
            prev.map((m) => (m.id === memberId ? current : m)),
          );
          return;
        }
        const saved = data.member as Member;
        setMembers((prev) => prev.map((m) => (m.id === memberId ? saved : m)));
      } catch {
        setError("Failed to connect to the server.");
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? current : m)),
        );
      }
    },
    [members],
  );

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/members/${confirmDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setDeleteError(data.error || "Delete failed.");
        return;
      }
      const deletedId = confirmDelete.id;
      setMembers((prev) => prev.filter((m) => m.id !== deletedId));
      if (expandedRow === deletedId) setExpandedRow(null);
      setConfirmDelete(null);
    } catch {
      setDeleteError("Failed to connect to the server.");
    } finally {
      setDeleting(false);
    }
  }, [confirmDelete, expandedRow]);

  const filtered = members.filter((m) => {
    if (filterPhase !== "all" && m.phase !== filterPhase) return false;
    if (filterType !== "all" && m.member_type !== filterType) return false;
    if (filterOwner !== "all" && (m.owner ?? "") !== filterOwner) return false;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      m.first_name?.toLowerCase().includes(q) ||
      m.last_name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.organization?.toLowerCase().includes(q) ||
      m.role?.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return <Loading message="Loading members…" />;
  }

  if (error && members.length === 0) {
    return <ErrorPage message={error} />;
  }

  return (
    <>
      <PageHeaderBlock
        count={filtered.length}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterPhase={filterPhase}
        setFilterPhase={setFilterPhase}
        filterType={filterType}
        setFilterType={setFilterType}
        filterOwner={filterOwner}
        setFilterOwner={setFilterOwner}
        onCreate={openCreateModal}
      />

      {error && (
        <div className={styles.errorSlot}>
          <ErrorCard>{error}</ErrorCard>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            Dismiss
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No members match"
          message={
            members.length === 0
              ? "Add your first member with the “New member” button."
              : "Try clearing a filter or search term."
          }
        />
      ) : (
        <MembersTable
          rows={filtered}
          expandedRow={expandedRow}
          setExpandedRow={setExpandedRow}
          onEdit={openEditModal}
          onDelete={(m) => {
            setDeleteError(null);
            setConfirmDelete(m);
          }}
          onStepToggle={handleStepToggle}
        />
      )}

      <MemberFormModal
        open={isModalOpen}
        editing={editingId !== null}
        isSaving={isSaving}
        form={form}
        setForm={setForm}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmModal
        member={confirmDelete}
        deleting={deleting}
        deleteError={deleteError}
        onClose={() => (deleting ? undefined : setConfirmDelete(null))}
        onConfirm={handleDelete}
      />
    </>
  );
}

/* =====================================================================
 * Sub-components (defined below)
 * ===================================================================== */

type HeaderProps = {
  count: number;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterPhase: MemberPhase | "all";
  setFilterPhase: (v: MemberPhase | "all") => void;
  filterType: MemberType | "all";
  setFilterType: (v: MemberType | "all") => void;
  filterOwner: string;
  setFilterOwner: (v: string) => void;
  onCreate: () => void;
};

function PageHeaderBlock({
  count,
  searchTerm,
  setSearchTerm,
  filterPhase,
  setFilterPhase,
  filterType,
  setFilterType,
  filterOwner,
  setFilterOwner,
  onCreate,
}: HeaderProps) {
  return (
    <PageHeader
      title="Members"
      count={
        <Badge variant="accent">
          {count} {count === 1 ? "member" : "members"}
        </Badge>
      }
      subtitle="Onboarding and lifecycle management for GhostSignal creators and brand partners."
      actions={
        <Button variant="primary" onClick={onCreate}>
          + New member
        </Button>
      }
      toolbar={
        <div className={styles.filterRow}>
          <SearchInput
            placeholder="Search name, email, organization, role, or tag…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Phase</span>
            <select
              className={styles.filterSelect}
              value={filterPhase}
              onChange={(e) =>
                setFilterPhase(e.target.value as MemberPhase | "all")
              }
            >
              <option value="all">All</option>
              {MEMBER_PHASES.map((s) => (
                <option key={s} value={s}>
                  {MEMBER_PHASE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Type</span>
            <select
              className={styles.filterSelect}
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as MemberType | "all")
              }
            >
              <option value="all">All</option>
              {MEMBER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MEMBER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Owner</span>
            <select
              className={styles.filterSelect}
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
            >
              <option value="all">All</option>
              {MEMBER_OWNERS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      }
    />
  );
}

type TableProps = {
  rows: Member[];
  expandedRow: string | null;
  setExpandedRow: (id: string | null) => void;
  onEdit: (m: Member) => void;
  onDelete: (m: Member) => void;
  onStepToggle: (
    memberId: string,
    stepKey: string,
    nextStatus: StepStatus,
  ) => void;
};

function MembersTable({
  rows,
  expandedRow,
  setExpandedRow,
  onEdit,
  onDelete,
  onStepToggle,
}: TableProps) {
  const columns: Column<Member>[] = [
    {
      key: "name",
      header: "Name",
      variant: "nowrap",
      cell: (m) => fullName(m),
    },
    {
      key: "email",
      header: "Email",
      variant: "truncate",
      cell: (m) =>
        m.email ? (
          <a
            className={styles.email}
            href={`mailto:${m.email}`}
            onClick={(e) => e.stopPropagation()}
          >
            {m.email}
          </a>
        ) : (
          "—"
        ),
    },
    {
      key: "organization",
      header: "Organization",
      variant: "truncate",
      cell: (m) => m.organization || "—",
    },
    {
      key: "type",
      header: "Type",
      cell: (m) => (
        <Badge variant={typeVariant(m.member_type)}>
          {MEMBER_TYPE_LABELS[m.member_type]}
        </Badge>
      ),
    },
    {
      key: "phase",
      header: "Phase",
      cell: (m) => {
        const { done, total } = countCompleted(
          m.lifecycle_steps,
          m.member_type,
        );
        const isFull = total > 0 && done === total;
        const days = daysSince(m.phase_entered_at);
        const isRot =
          days !== null &&
          days > ROT_THRESHOLD_DAYS &&
          m.phase !== "run" &&
          m.phase !== "paused" &&
          m.phase !== "churned";
        return (
          <span className={styles.phaseCell}>
            <Badge variant={phaseVariant(m.phase)}>
              {MEMBER_PHASE_LABELS[m.phase]}
            </Badge>
            <span
              className={[
                styles.progressPill,
                isFull ? styles.progressPillFull : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={
                total === 0
                  ? "No applicable steps"
                  : `${done} of ${total} lifecycle steps complete`
              }
            >
              {done}/{total}
            </span>
            {isRot && (
              <span
                className={styles.rotDot}
                title={`${days} days in ${MEMBER_PHASE_LABELS[m.phase]} — may be stuck`}
                aria-label="Stalled in current phase"
              />
            )}
          </span>
        );
      },
    },
    {
      key: "owner",
      header: "Owner",
      variant: "muted",
      cell: (m) => m.owner || "—",
    },
    {
      key: "last_contact",
      header: "Last contact",
      variant: "muted",
      cell: (m) => (
        <span className={styles.date}>{formatDate(m.last_contact_at)}</span>
      ),
    },
    {
      key: "expand",
      header: "",
      variant: "numeric",
      cell: (m) => (
        <span className={styles.expandGlyph}>
          {expandedRow === m.id ? "−" : "+"}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      rows={rows}
      columns={columns}
      expandedRowId={expandedRow}
      onToggleRow={(id) => setExpandedRow(expandedRow === id ? null : id)}
      renderExpanded={(m) => (
        <div className={styles.detailsBlock}>
          <DetailsGrid>
            <DetailsSection title="Contact">
              <p>
                <strong>Role:</strong> {m.role || "—"}
              </p>
              <p>
                <strong>Phone:</strong> {m.phone || "—"}
              </p>
              <p>
                <strong>Website:</strong>{" "}
                {m.website ? (
                  <a
                    href={m.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.website}
                  </a>
                ) : (
                  "—"
                )}
              </p>
            </DetailsSection>
            <DetailsSection title="Pipeline">
              <p>
                <strong>Phase:</strong> {MEMBER_PHASE_LABELS[m.phase]}
              </p>
              <p>
                <strong>Owner:</strong> {m.owner || "—"}
              </p>
              <p>
                <strong>Next step:</strong> {m.next_step || "—"}
              </p>
              <p>
                <strong>Last contact:</strong> {formatDate(m.last_contact_at)}
              </p>
              <p>
                <strong>Added:</strong> {formatDate(m.created_at)}
              </p>
            </DetailsSection>
          </DetailsGrid>

          {m.tags.length > 0 && (
            <div className={styles.tagsRow}>
              {m.tags.map((t) => (
                <span key={t} className={styles.tagChip}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {m.notes && (
            <div className={styles.notesPanel}>
              <h4>Notes</h4>
              <p>{m.notes}</p>
            </div>
          )}

          <LifecycleChecklist
            member={m}
            onStepToggle={(stepKey, nextStatus) =>
              onStepToggle(m.id, stepKey, nextStatus)
            }
          />

          <MemberComments memberId={m.id} />

          <DetailsActions>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(m);
              }}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(m);
              }}
            >
              Delete
            </Button>
          </DetailsActions>
        </div>
      )}
    />
  );
}

type FormModalProps = {
  open: boolean;
  editing: boolean;
  isSaving: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

function MemberFormModal({
  open,
  editing,
  isSaving,
  form,
  setForm,
  onClose,
  onSubmit,
}: FormModalProps) {
  const up = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!isSaving}
      size="xl"
      title={editing ? "Edit member" : "New member"}
      subtitle="At minimum, provide a first name, last name, or organization."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="member-form"
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : editing ? "Update member" : "Create member"}
          </Button>
        </>
      }
    >
      <form id="member-form" className={styles.form} onSubmit={onSubmit}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="first_name">
              First name
            </label>
            <input
              id="first_name"
              className={styles.input}
              value={form.first_name}
              onChange={(e) => up("first_name", e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="last_name">
              Last name
            </label>
            <input
              id="last_name"
              className={styles.input}
              value={form.last_name}
              onChange={(e) => up("last_name", e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={form.email}
              onChange={(e) => up("email", e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              className={styles.input}
              value={form.phone}
              onChange={(e) => up("phone", e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="member_type">
              Type
            </label>
            <select
              id="member_type"
              className={styles.select}
              value={form.member_type}
              onChange={(e) => up("member_type", e.target.value as MemberType)}
              disabled={isSaving}
            >
              {MEMBER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MEMBER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="phase">
              Phase
            </label>
            <select
              id="phase"
              className={styles.select}
              value={form.phase}
              onChange={(e) => up("phase", e.target.value as MemberPhase)}
              disabled={isSaving}
            >
              {MEMBER_PHASES.map((s) => (
                <option key={s} value={s}>
                  {MEMBER_PHASE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="organization">
              Organization
            </label>
            <input
              id="organization"
              className={styles.input}
              value={form.organization}
              onChange={(e) => up("organization", e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="role">
              Role
            </label>
            <input
              id="role"
              className={styles.input}
              value={form.role}
              onChange={(e) => up("role", e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="website">
              Website
            </label>
            <input
              id="website"
              className={styles.input}
              placeholder="https://…"
              value={form.website}
              onChange={(e) => up("website", e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="owner">
              Owner
            </label>
            <select
              id="owner"
              className={styles.select}
              value={form.owner}
              onChange={(e) => up("owner", e.target.value)}
              disabled={isSaving}
            >
              <option value="">Unassigned</option>
              {MEMBER_OWNERS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="next_step">
              Next step
            </label>
            <input
              id="next_step"
              className={styles.input}
              placeholder="e.g. Send intro deck"
              value={form.next_step}
              onChange={(e) => up("next_step", e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="last_contact_at">
              Last contact
            </label>
            <input
              id="last_contact_at"
              type="date"
              className={styles.input}
              value={form.last_contact_at}
              onChange={(e) => up("last_contact_at", e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className={styles.formGroupFull}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="tags">
              Tags
            </label>
            <input
              id="tags"
              className={styles.input}
              placeholder="Comma-separated: podcast, climate, intro-call"
              value={form.tagsCsv}
              onChange={(e) => up("tagsCsv", e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className={styles.formGroupFull}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              className={styles.textarea}
              rows={4}
              value={form.notes}
              onChange={(e) => up("notes", e.target.value)}
              disabled={isSaving}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

type DeleteModalProps = {
  member: Member | null;
  deleting: boolean;
  deleteError: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

function DeleteConfirmModal({
  member,
  deleting,
  deleteError,
  onClose,
  onConfirm,
}: DeleteModalProps) {
  return (
    <Modal
      open={member !== null}
      onClose={onClose}
      dismissible={!deleting}
      size="sm"
      title="Delete this member?"
      subtitle="This action cannot be undone."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructiveSolid"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Yes, delete"}
          </Button>
        </>
      }
    >
      <p>
        This will permanently remove{" "}
        <strong>{member ? fullName(member) : ""}</strong>
        {member?.organization ? ` (${member.organization})` : ""} from the
        database.
      </p>
      {deleteError && <ErrorCard>{deleteError}</ErrorCard>}
    </Modal>
  );
}

/* =====================================================================
 * Lifecycle checklist — Jack's 12 checkpoints grouped by phase.
 * ===================================================================== */

type ChecklistProps = {
  member: Member;
  onStepToggle: (stepKey: string, nextStatus: StepStatus) => void;
};

function LifecycleChecklist({ member, onStepToggle }: ChecklistProps) {
  // Group steps by phase, preserving the canonical order from the lib.
  const byPhase = new Map<string, LifecycleStepDef[]>();
  for (const step of LIFECYCLE_STEPS) {
    const list = byPhase.get(step.phase) ?? [];
    list.push(step);
    byPhase.set(step.phase, list);
  }

  const { done, total } = countCompleted(
    member.lifecycle_steps,
    member.member_type,
  );

  return (
    <div className={styles.lifecycleBlock}>
      <h4>
        Lifecycle
        <span
          className={styles.progressPill}
          style={{ marginLeft: 12, verticalAlign: "middle" }}
        >
          {done}/{total}
        </span>
      </h4>

      {Array.from(byPhase.entries()).map(([phaseKey, steps]) => (
        <div key={phaseKey} className={styles.phaseGroup}>
          <div className={styles.phaseGroupHeader}>
            <Badge variant={phaseVariant(phaseKey as MemberPhase)}>
              {MEMBER_PHASE_LABELS[phaseKey as MemberPhase]}
            </Badge>
          </div>
          <div className={styles.stepList}>
            {steps.map((step) => (
              <StepRow
                key={step.key}
                step={step}
                member={member}
                onToggle={onStepToggle}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type StepRowProps = {
  step: LifecycleStepDef;
  member: Member;
  onToggle: (stepKey: string, nextStatus: StepStatus) => void;
};

function StepRow({ step, member, onToggle }: StepRowProps) {
  const stored = member.lifecycle_steps?.[step.key];
  const isNa =
    stored?.status === "na" ||
    (step.creatorOnly && member.member_type !== "creator" && !stored);
  const status: StepStatus = stored?.status ?? (isNa ? "na" : "todo");
  const isDone = status === "done";

  const rowCls = [styles.stepRow, isNa ? styles.stepRowNa : ""]
    .filter(Boolean)
    .join(" ");
  const labelCls = [styles.stepLabel, isDone ? styles.stepLabelDone : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <label
      className={rowCls}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        className={styles.stepCheckbox}
        checked={isDone}
        disabled={isNa}
        onChange={(e) =>
          onToggle(step.key, e.target.checked ? "done" : "todo")
        }
      />
      <span className={labelCls}>
        {step.label}
        {isNa && " (N/A)"}
      </span>
      <span className={styles.stepRoleTag}>{step.ownerRole}</span>
      <span className={styles.stepDate}>
        {isDone && stored?.completed_at
          ? new Date(stored.completed_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : ""}
      </span>
    </label>
  );
}

/* =====================================================================
 * Comments — one thread per member, authored by one of the four
 * founders, rendered newest-first.
 * ===================================================================== */

type MemberComment = {
  id: string;
  member_id: string;
  author: string;
  content: string;
  created_at: string;
};

function formatCommentTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MemberComments({ memberId }: { memberId: string }) {
  const [comments, setComments] = useState<MemberComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [author, setAuthor] = useState<string>(MEMBER_OWNERS[0]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Fetch once when the expanded row mounts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/members/comments?member_id=${memberId}`,
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setLoadError(data.error || "Failed to load comments.");
          return;
        }
        setComments(data.comments as MemberComment[]);
      } catch {
        if (!cancelled) setLoadError("Failed to connect to the server.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const handlePost = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const trimmed = body.trim();
      if (!trimmed || posting) return;
      setPosting(true);
      setPostError(null);
      try {
        const res = await fetch("/api/members/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            member_id: memberId,
            author,
            content: trimmed,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setPostError(data.error || "Failed to post comment.");
          return;
        }
        setComments((prev) => [data.comment as MemberComment, ...prev]);
        setBody("");
      } catch {
        setPostError("Failed to connect to the server.");
      } finally {
        setPosting(false);
      }
    },
    [memberId, author, body, posting],
  );

  const handleDelete = useCallback(async (commentId: string) => {
    try {
      const res = await fetch(`/api/members/comments?id=${commentId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) return;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      /* swallow — next load refetches */
    }
  }, []);

  return (
    <div className={styles.commentsBlock} onClick={(e) => e.stopPropagation()}>
      <h4>Comments</h4>

      <div className={styles.commentsList}>
        {!loaded ? (
          <p className={styles.commentEmpty}>Loading…</p>
        ) : loadError ? (
          <ErrorCard>{loadError}</ErrorCard>
        ) : comments.length === 0 ? (
          <p className={styles.commentEmpty}>
            No comments yet. Leave the first one below.
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <span className={styles.commentAuthor}>{c.author}</span>
                <span className={styles.commentDate}>
                  {formatCommentTimestamp(c.created_at)}
                </span>
              </div>
              <button
                type="button"
                className={styles.commentDeleteBtn}
                onClick={() => handleDelete(c.id)}
                aria-label="Delete comment"
              >
                ×
              </button>
              <p className={styles.commentBody}>{c.content}</p>
            </div>
          ))
        )}
      </div>

      <form className={styles.commentForm} onSubmit={handlePost}>
        <div className={styles.commentFormTopRow}>
          <span className={styles.filterLabel}>Author</span>
          <select
            className={styles.filterSelect}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            disabled={posting}
          >
            {MEMBER_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <textarea
          className={styles.commentTextarea}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment…"
          disabled={posting}
          rows={3}
        />
        {postError && <ErrorCard>{postError}</ErrorCard>}
        <div className={styles.commentFormActions}>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={posting || body.trim().length === 0}
          >
            {posting ? "Posting…" : "Post comment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
