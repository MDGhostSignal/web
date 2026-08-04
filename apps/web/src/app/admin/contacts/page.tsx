"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Badge,
  type BadgeVariant,
  Button,
  type Column,
  DataTable,
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
  LIFECYCLE_STEPS,
  MEMBER_OWNERS,
  MEMBER_PHASE_LABELS,
  MEMBER_PHASES,
  MEMBER_TYPE_LABELS,
  MEMBER_TYPES,
  type LifecycleStepDef,
  type LifecycleSteps,
  type Member,
  type MemberPhase,
  type MemberType,
  type MemberWritable,
  type StepStatus,
} from "@/lib/members";

/** Returns the member's lifecycle_steps with `discernment` flipped to
 *  "done" — the marker used by `deriveStatus()` to tell an explicitly-
 *  triaged contact (state: discern) from a brand-new untouched row
 *  (state: untouched). Preserves any prior completed_at so we don't
 *  bump the date on re-clicks. */
function withDiscernmentDone(current: Member): LifecycleSteps {
  const today = new Date().toISOString().slice(0, 10);
  const existing = current.lifecycle_steps?.discernment;
  return {
    ...(current.lifecycle_steps ?? {}),
    discernment: {
      status: "done",
      completed_at: existing?.completed_at ?? today,
    },
  };
}

import { XQSummaryCard } from "@/components/admin/XQSummaryCard";

import {
  ContactLifecycleStepper,
  DERIVED_STATUSES,
  DERIVED_STATUS_LABELS,
  deriveStatus,
  type DerivedStatus,
} from "./ContactLifecycleStepper";
import styles from "./contacts.module.css";

/**
 * Translate a clicked traffic-light status into the Member field
 * updates that produce that derived status. The categorical signal
 * lives in `response_kind`; the free-text `last_response` stays as-is
 * so the founder can write context independently of the bucket.
 *
 * Backtracking semantics: clicking "Discern" or "Reached out" clears
 * `response_kind` so the stepper doesn't keep displaying a downstream
 * (more-advanced) state.
 */
function statusToPatch(
  next: DerivedStatus,
  current: Member,
): MemberWritable {
  const nowIso = new Date().toISOString();
  // Every forward-of-untouched click marks the discernment step done
  // so deriveStatus() flips out of "untouched". Cached once here so
  // each branch can reuse it.
  const lifecycleStepsWithDiscernment = withDiscernmentDone(current);

  switch (next) {
    case "untouched":
      // Reserved for completeness — the stepper has no circle that
      // maps to "untouched", so this branch is unreachable from the
      // UI. If a future caller wires it up, clear the discernment
      // marker (and downstream signals) to send the row back to the
      // initial state.
      return {
        phase: "discern",
        became_member_at: null,
        last_contact_at: null,
        response_kind: null,
        lifecycle_steps: {
          ...(current.lifecycle_steps ?? {}),
          discernment: { status: "todo", completed_at: null },
        },
      };
    case "discern":
      return {
        phase: "discern",
        became_member_at: null,
        response_kind: null,
        lifecycle_steps: lifecycleStepsWithDiscernment,
      };
    case "reached-out":
      return {
        phase: "court",
        became_member_at: null,
        last_contact_at: current.last_contact_at ?? nowIso,
        response_kind: null,
        lifecycle_steps: lifecycleStepsWithDiscernment,
      };
    case "replied-no":
      return {
        phase: "court",
        became_member_at: null,
        last_contact_at: current.last_contact_at ?? nowIso,
        response_kind: "no",
        lifecycle_steps: lifecycleStepsWithDiscernment,
      };
    case "replied-interested":
      return {
        phase: "court",
        became_member_at: null,
        last_contact_at: current.last_contact_at ?? nowIso,
        response_kind: "interested",
        lifecycle_steps: lifecycleStepsWithDiscernment,
      };
    case "member":
      return {
        became_member_at: current.became_member_at ?? nowIso,
        lifecycle_steps: lifecycleStepsWithDiscernment,
      };
    case "stopped":
      return { phase: "paused" };
  }
}

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
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
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
  shipping_address_line1: "",
  shipping_address_line2: "",
  shipping_city: "",
  shipping_state: "",
  shipping_postal_code: "",
  shipping_country: "",
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
    shipping_address_line1: m.shipping_address_line1 ?? "",
    shipping_address_line2: m.shipping_address_line2 ?? "",
    shipping_city: m.shipping_city ?? "",
    shipping_state: m.shipping_state ?? "",
    shipping_postal_code: m.shipping_postal_code ?? "",
    shipping_country: m.shipping_country ?? "",
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
    shipping_address_line1: f.shipping_address_line1.trim() || null,
    shipping_address_line2: f.shipping_address_line2.trim() || null,
    shipping_city: f.shipping_city.trim() || null,
    shipping_state: f.shipping_state.trim() || null,
    shipping_postal_code: f.shipping_postal_code.trim() || null,
    shipping_country: f.shipping_country.trim() || null,
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
  const [filterStatus, setFilterStatus] = useState<DerivedStatus | "all">(
    "all",
  );
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
          setError(data.error || "Failed to load contacts.");
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

  // Generic inline-edit handler for the expanded card. Same optimistic
  // update + rollback pattern as handleStepToggle, but accepts any
  // partial MemberWritable so a single callback covers notes,
  // contact_count, last_response, and any future inline fields.
  // Returns true on success so the field editor can show its own
  // "Saving / Saved / Error" indicator.
  const handleMemberPatch = useCallback(
    async (
      memberId: string,
      partial: MemberWritable,
    ): Promise<boolean> => {
      const current = members.find((m) => m.id === memberId);
      if (!current) return false;

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, ...partial } : m)),
      );

      try {
        const res = await fetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partial),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          setError(data.error || "Failed to save changes.");
          setMembers((prev) =>
            prev.map((m) => (m.id === memberId ? current : m)),
          );
          return false;
        }
        const saved = data.member as Member;
        setMembers((prev) => prev.map((m) => (m.id === memberId ? saved : m)));
        return true;
      } catch {
        setError("Failed to connect to the server.");
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? current : m)),
        );
        return false;
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
    if (filterStatus !== "all" && deriveStatus(m) !== filterStatus) return false;
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
    return <Loading message="Loading contacts…" />;
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
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
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
          title="No contacts match"
          message={
            members.length === 0
              ? "Add your first contact with the “New contact” button."
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
          onMemberPatch={handleMemberPatch}
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
  filterStatus: DerivedStatus | "all";
  setFilterStatus: (v: DerivedStatus | "all") => void;
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
  filterStatus,
  setFilterStatus,
  filterType,
  setFilterType,
  filterOwner,
  setFilterOwner,
  onCreate,
}: HeaderProps) {
  return (
    <PageHeader
      title="Contacts"
      count={
        <Badge variant="accent">
          {count} {count === 1 ? "contact" : "contacts"}
        </Badge>
      }
      subtitle="Outreach and onboarding progress for prospective creators and brand partners."
      actions={
        <Button variant="primary" onClick={onCreate}>
          + New contact
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
            <span className={styles.filterLabel}>Status</span>
            <select
              className={styles.filterSelect}
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as DerivedStatus | "all")
              }
            >
              <option value="all">All</option>
              {DERIVED_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {DERIVED_STATUS_LABELS[s]}
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
  onMemberPatch: (
    memberId: string,
    partial: MemberWritable,
  ) => Promise<boolean>;
};

function MembersTable({
  rows,
  expandedRow,
  setExpandedRow,
  onEdit,
  onDelete,
  onStepToggle,
  onMemberPatch,
}: TableProps) {
  const columns: Column<Member>[] = [
    {
      key: "name",
      header: "Name",
      variant: "nowrap",
      // Sort by the displayed full name. Empty names ("—") sort to the
      // bottom on asc so unnamed rows (org-only contacts) don't lead.
      sort: (a, b) => {
        const av = fullName(a);
        const bv = fullName(b);
        const aEmpty = av === "—";
        const bEmpty = bv === "—";
        if (aEmpty && !bEmpty) return 1;
        if (bEmpty && !aEmpty) return -1;
        return av.localeCompare(bv);
      },
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
      // Empty organizations sort to the bottom on asc — same pattern as
      // the Owner column above.
      sort: (a, b) => {
        const av = a.organization ?? "";
        const bv = b.organization ?? "";
        if (av === "" && bv !== "") return 1;
        if (bv === "" && av !== "") return -1;
        return av.localeCompare(bv);
      },
      cell: (m) => m.organization || "—",
    },
    {
      key: "type",
      header: "Type",
      // Sort alphabetically by the human label ("Brand" / "Creator" /
      // "Other") so the visible order matches what's on screen.
      sort: (a, b) =>
        MEMBER_TYPE_LABELS[a.member_type].localeCompare(
          MEMBER_TYPE_LABELS[b.member_type],
        ),
      cell: (m) => (
        <Badge variant={typeVariant(m.member_type)}>
          {MEMBER_TYPE_LABELS[m.member_type]}
        </Badge>
      ),
    },
    {
      key: "phase",
      header: "Lifecycle",
      cell: (m) => <ContactLifecycleStepper member={m} variant="compact" />,
    },
    {
      key: "owner",
      header: "Owner",
      variant: "muted",
      // Unassigned rows ("") sort to the bottom on asc, top on desc —
      // the empty string would otherwise sort first alphabetically.
      sort: (a, b) => {
        const av = a.owner ?? "";
        const bv = b.owner ?? "";
        if (av === "" && bv !== "") return 1;
        if (bv === "" && av !== "") return -1;
        return av.localeCompare(bv);
      },
      cell: (m) => m.owner || "—",
    },
    {
      key: "last_contact",
      header: "Last contact",
      variant: "muted",
      // Sort by ISO date string — same ordering as chronological since
      // ISO is lexicographically sortable. Empty / null values sort to
      // the bottom on asc (never-contacted rows park at the end) and
      // to the top on desc (matching the Owner-column convention).
      sort: (a, b) => {
        const av = a.last_contact_at ?? "";
        const bv = b.last_contact_at ?? "";
        if (av === "" && bv !== "") return 1;
        if (bv === "" && av !== "") return -1;
        return av.localeCompare(bv);
      },
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
      rowClassName={(m) => (m.became_member_at ? styles.graduatedRow : "")}
      renderExpanded={(m) => (
        <div className={styles.detailsBlock}>
          {/* Lifecycle stepper — promoted to the top of the panel. Same
              visual treatment as the marketplace pool stepper. Circles
              are clickable: each one PATCHes the underlying member
              fields (phase, last_contact_at, last_response,
              became_member_at) so the derived status lands on the
              clicked step. The PipelineCard / "Has become a GhostSignal
              member" button below remain available for finer control. */}
          <ContactLifecycleStepper
            member={m}
            variant="full"
            onSetStatus={(next) => {
              void onMemberPatch(m.id, statusToPatch(next, m));
            }}
          />

          {/* Actions row — the primary "become a member" action plus
              Edit / Delete. Sits below the stepper now (the stepper is
              the more informative scan target). */}
          <div className={styles.leadActions}>
            <Button
              variant={m.became_member_at ? "secondary" : "primary"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                void onMemberPatch(m.id, {
                  became_member_at: m.became_member_at
                    ? null
                    : new Date().toISOString(),
                });
              }}
              title={
                m.became_member_at
                  ? `Marked as member on ${formatDate(m.became_member_at)} — click to undo`
                  : "Mark this contact as a full GhostSignal member; they'll appear in the marketplace pool."
              }
            >
              {m.became_member_at
                ? `✓ Member since ${formatDate(m.became_member_at)} — unmark`
                : "Has become a GhostSignal member"}
            </Button>
            <div className={styles.leadActionsGroup}>
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
            </div>
          </div>

          <div className={styles.topGrid}>
            <ContactCard member={m} />
            <PipelineCard
              member={m}
              onPatch={(partial) => onMemberPatch(m.id, partial)}
            />
          </div>

          {/* XQ summary — only when the contact has a linked Conviction
              Quotient submission (set by /xq-quiz's email-link best-effort
              after they complete the public quiz). */}
          {m.xq_submission_id && (
            <XQSummaryCard submissionId={m.xq_submission_id} />
          )}

          {m.tags.length > 0 && (
            <div className={styles.tagsRow}>
              {m.tags.map((t) => (
                <span key={t} className={styles.tagChip}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Lifecycle (6 steps) + Comments thread side-by-side on a
              horizontal plane — uses the available width rather than
              stacking the two blocks vertically, which made the
              expanded panel disproportionately tall after the
              lifecycle was trimmed from 13 → 6 steps. */}
          <div className={styles.lifecycleCommentsGrid}>
            {/* The 6-step Discern+Court checklist is now secondary —
                the new ContactLifecycleStepper at the top of the panel
                is the primary lifecycle view. Keeps the granular steps
                one click away for per-step tracking (first contact,
                meeting, deck sent, etc.). */}
            <details className={styles.lifecycleDetails}>
              <summary className={styles.lifecycleDetailsSummary}>
                <span>Show step details</span>
                <span aria-hidden="true">▾</span>
              </summary>
              <LifecycleChecklist
                member={m}
                onStepToggle={(stepKey, nextStatus) =>
                  onStepToggle(m.id, stepKey, nextStatus)
                }
              />
            </details>
            <MemberComments memberId={m.id} />
          </div>
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
      title={editing ? "Edit contact" : "New contact"}
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
            {isSaving ? "Saving…" : editing ? "Update contact" : "Create contact"}
          </Button>
        </>
      }
    >
      <form id="member-form" className={styles.form} onSubmit={onSubmit}>
        <div className={styles.formGrid}>
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

        <div className={styles.formGroupFull}>
          <label className={styles.label} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className={styles.textarea}
            rows={3}
            value={form.notes}
            onChange={(e) => up("notes", e.target.value)}
            disabled={isSaving}
          />
        </div>

        <section className={styles.shippingSection}>
          <header className={styles.shippingHeader}>
            <h3 className={styles.shippingTitle}>Shipping address</h3>
            <span className={styles.shippingHint}>
              For mailing membership boxes + swag. Optional.
            </span>
          </header>
          <div className={styles.formGroupFull}>
            <label className={styles.label} htmlFor="shipping_address_line1">
              Street address
            </label>
            <input
              id="shipping_address_line1"
              className={styles.input}
              placeholder="123 Main St"
              value={form.shipping_address_line1}
              onChange={(e) => up("shipping_address_line1", e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className={styles.formGroupFull}>
            <label className={styles.label} htmlFor="shipping_address_line2">
              Apt / suite (optional)
            </label>
            <input
              id="shipping_address_line2"
              className={styles.input}
              placeholder="Suite 200"
              value={form.shipping_address_line2}
              onChange={(e) => up("shipping_address_line2", e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="shipping_city">
                City
              </label>
              <input
                id="shipping_city"
                className={styles.input}
                value={form.shipping_city}
                onChange={(e) => up("shipping_city", e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="shipping_state">
                State / Province
              </label>
              <input
                id="shipping_state"
                className={styles.input}
                value={form.shipping_state}
                onChange={(e) => up("shipping_state", e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="shipping_postal_code">
                Postal code
              </label>
              <input
                id="shipping_postal_code"
                className={styles.input}
                value={form.shipping_postal_code}
                onChange={(e) => up("shipping_postal_code", e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="shipping_country">
                Country
              </label>
              <input
                id="shipping_country"
                className={styles.input}
                placeholder="United States"
                value={form.shipping_country}
                onChange={(e) => up("shipping_country", e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>
        </section>
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
      title="Delete this contact?"
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

/* =====================================================================
 * Contact ID card + Pipeline card — top row of the expanded panel.
 * Replaces the older DetailsGrid (Contact / Pipeline two-column block)
 * with two visually distinct cards: a compact ID-card-style contact
 * summary on the left, and a pipeline card on the right that includes
 * an inline-editable notes textarea.
 * ===================================================================== */

function ContactCard({ member }: { member: Member }) {
  const name = fullName(member) || "(no name)";
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className={styles.contactCard} aria-label="Contact details">
      <div className={styles.contactCardHeader}>
        <div className={styles.contactAvatar} aria-hidden="true">
          {initials || "—"}
        </div>
        <div className={styles.contactCardHeaderText}>
          <div className={styles.contactCardName}>{name}</div>
          <div className={styles.contactCardSub}>
            <Badge variant={typeVariant(member.member_type)}>
              {MEMBER_TYPE_LABELS[member.member_type]}
            </Badge>
            {member.role && (
              <span className={styles.contactCardRole}>{member.role}</span>
            )}
          </div>
        </div>
      </div>

      <dl className={styles.contactCardFields}>
        <div>
          <dt>Organization</dt>
          <dd>{member.organization || "—"}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>
            {member.email ? (
              <a href={`mailto:${member.email}`}>{member.email}</a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>
            {member.phone ? (
              <a href={`tel:${member.phone}`}>{member.phone}</a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt>Website</dt>
          <dd>
            {member.website ? (
              <a
                href={member.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                {member.website}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        {member.member_type === "creator" && (
          <div>
            <dt>RSS feed</dt>
            <dd>
              {member.creators?.rss_url ? (
                <a
                  href={member.creators.rss_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {member.creators.rss_url}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

type PipelineCardProps = {
  member: Member;
  onPatch: (partial: MemberWritable) => Promise<boolean>;
};

/**
 * Small hook: keeps a local draft in sync with an upstream value via
 * the React 19 render-phase compare-and-set idiom (avoids the
 * `react-hooks/set-state-in-effect` rule). The parent rewrites the
 * member object after a successful PATCH echo; this picks that up
 * and re-seeds the input.
 */
function useDraftSync<T>(upstream: T): [T, (next: T) => void] {
  const [draft, setDraft] = useState<T>(upstream);
  const [lastSeen, setLastSeen] = useState<T>(upstream);
  if (upstream !== lastSeen) {
    setLastSeen(upstream);
    setDraft(upstream);
  }
  return [draft, setDraft];
}

function PipelineCard({ member, onPatch }: PipelineCardProps) {
  const [draftNotes, setDraftNotes] = useDraftSync(member.notes ?? "");
  const [draftResponse, setDraftResponse] = useDraftSync(
    member.last_response ?? "",
  );
  const [draftCount, setDraftCount] = useDraftSync(
    member.contact_count === null || member.contact_count === undefined
      ? ""
      : String(member.contact_count),
  );
  const [draftOwner, setDraftOwner] = useDraftSync(member.owner ?? "");
  // The date input's value is a YYYY-MM-DD string. Slice the leading
  // 10 chars of the stored ISO timestamp to seed it — works whether
  // the column is `date` or `timestamptz` in Supabase.
  const [draftLastContact, setDraftLastContact] = useDraftSync(
    member.last_contact_at ? member.last_contact_at.slice(0, 10) : "",
  );
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Shared save runner — each field's onBlur computes its own
  // before/after compare and only calls this when the value actually
  // changed. Status pill is shared across the three fields (one
  // indicator next to the card header rather than per-field).
  const runSave = async (partial: MemberWritable) => {
    setStatus("saving");
    const ok = await onPatch(partial);
    if (ok) {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } else {
      setStatus("error");
    }
  };

  const handleNotesBlur = () => {
    if (draftNotes === (member.notes ?? "")) return;
    void runSave({ notes: draftNotes });
  };

  const handleResponseBlur = () => {
    if (draftResponse === (member.last_response ?? "")) return;
    void runSave({ last_response: draftResponse });
  };

  const handleCountBlur = () => {
    const trimmed = draftCount.trim();
    let nextValue: number | null;
    if (trimmed === "") {
      nextValue = null;
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) return; // invalid — drop save
      nextValue = Math.floor(n);
    }
    if (nextValue === (member.contact_count ?? null)) return;
    void runSave({ contact_count: nextValue });
  };

  // Owner saves on change (not blur) — dropdown selections are
  // intentional and the user expects the choice to commit immediately.
  const handleOwnerChange = (nextOwner: string) => {
    setDraftOwner(nextOwner);
    const normalized = nextOwner === "" ? null : nextOwner;
    if (normalized === (member.owner ?? null)) return;
    void runSave({ owner: normalized });
  };

  // Date picker also saves on change — the browser commits a value only
  // when the user picks a date, so onChange is the canonical "user
  // chose this" event for type=date.
  const handleLastContactChange = (next: string) => {
    setDraftLastContact(next);
    const current = member.last_contact_at
      ? member.last_contact_at.slice(0, 10)
      : "";
    if (next === current) return;
    // Empty string → null (clear the date). Non-empty YYYY-MM-DD is
    // sent through as-is; Postgres timestamptz parses it as midnight
    // UTC of the chosen day.
    void runSave({ last_contact_at: next === "" ? null : next });
  };

  return (
    <section className={styles.pipelineCard} aria-label="Pipeline">
      <div className={styles.pipelineCardHeader}>
        <span>Pipeline</span>
        <span className={styles.pipelineCardStatus} aria-live="polite">
          {status === "saving" && "Saving…"}
          {status === "saved" && "Saved"}
          {status === "error" && "Failed to save"}
        </span>
      </div>
      <dl className={styles.pipelineFields}>
        <div>
          <dt>Phase</dt>
          <dd>
            <Badge variant={phaseVariant(member.phase)}>
              {MEMBER_PHASE_LABELS[member.phase]}
            </Badge>
          </dd>
        </div>
        <div>
          <dt>Next step</dt>
          <dd>{member.next_step || "—"}</dd>
        </div>
        <div>
          <dt>Added</dt>
          <dd>{formatDate(member.created_at)}</dd>
        </div>
      </dl>

      <div className={styles.pipelineInlineFields}>
        <label className={styles.pipelineInlineField}>
          <span className={styles.pipelineInlineLabel}>Owner</span>
          <select
            className={styles.pipelineInlineInput}
            value={draftOwner}
            onChange={(e) => handleOwnerChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="">—</option>
            {MEMBER_OWNERS.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.pipelineInlineField}>
          <span className={styles.pipelineInlineLabel}>Last contact</span>
          <input
            type="date"
            className={styles.pipelineInlineInput}
            value={draftLastContact}
            onChange={(e) => handleLastContactChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        </label>
        <label className={styles.pipelineInlineField}>
          <span className={styles.pipelineInlineLabel}>Times contacted</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className={styles.pipelineInlineInput}
            value={draftCount}
            onChange={(e) => setDraftCount(e.target.value)}
            onBlur={handleCountBlur}
            onClick={(e) => e.stopPropagation()}
            placeholder="0"
          />
        </label>
        <label className={styles.pipelineInlineField}>
          <span className={styles.pipelineInlineLabel}>Last response</span>
          <input
            type="text"
            className={styles.pipelineInlineInput}
            value={draftResponse}
            onChange={(e) => setDraftResponse(e.target.value)}
            onBlur={handleResponseBlur}
            onClick={(e) => e.stopPropagation()}
            placeholder="What did they say? — “Wants case studies”, “Quiet since Apr”, …"
          />
        </label>
      </div>

      <div className={styles.pipelineNotesField}>
        <div className={styles.pipelineNotesLabel}>Notes</div>
        <textarea
          className={styles.pipelineNotesTextarea}
          value={draftNotes}
          onChange={(e) => setDraftNotes(e.target.value)}
          onBlur={handleNotesBlur}
          onClick={(e) => e.stopPropagation()}
          placeholder="Outreach details, conversation history, next-step rationale…"
          rows={4}
        />
      </div>
    </section>
  );
}

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

  // Render a single phase group (badge header + step rows). Pulled out
  // of the loop so the new column layout can place specific phases
  // into specific slots: discern + court in the left column, sign +
  // onboard in the right column, run as a full-width row below.
  const renderPhase = (phaseKey: MemberPhase) => {
    const steps = byPhase.get(phaseKey);
    if (!steps || steps.length === 0) return null;
    return (
      <div className={styles.phaseGroup} key={phaseKey}>
        <div className={styles.phaseGroupHeader}>
          <Badge variant={phaseVariant(phaseKey)}>
            {MEMBER_PHASE_LABELS[phaseKey]}
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
    );
  };

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

      {/* Lead-stage checklist is 6 steps across discern + court only —
          sign / onboard / run live in the marketplace lifecycle and no
          longer surface here. A single-column stack reads cleanly at
          this size; revisit if more lead-stage steps are added. */}
      {renderPhase("discern")}
      {renderPhase("court")}
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
