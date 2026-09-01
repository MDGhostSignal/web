"use client";

import { useMemo, useState } from "react";

import {
  Badge,
  Button,
  type Column,
  DataTable,
  EmptyState,
  Modal,
  SearchInput,
  typeVariant,
} from "@/components/admin";
import type { MarketplaceEntity } from "@/lib/marketplace-mocks";
import type { Match } from "@/lib/marketplace-store";
import { RQResultsGraph } from "@/components/rq/RQResultsGraph";
import type { RQResult } from "@/lib/rq/scoring";
import {
  countMarketplaceCompleted,
  type LifecycleSteps,
  type Member,
  type MemberType,
  type MemberWritable,
  type StepStatus,
} from "@/lib/members";

import { XQSummaryCard } from "@/components/admin/XQSummaryCard";

import { MemberEditModal } from "../components/MemberEditModal";

import { Art19MigrationChecklist } from "./Art19MigrationChecklist";
import { LifecycleStepper } from "./LifecycleStepper";
import styles from "./marketplace.module.css";
import {
  MarketplaceMemberComments,
  MarketplaceMemberDetails,
} from "./MarketplaceMemberDetails";

/** Map a marketplace entity (traits 0–100) onto the RQResult shape the
 *  public RQResultsGraph component consumes (per-axis 1–10 score +
 *  letter + band). The letter convention mirrors the canonical RQ
 *  axes — values: I/F, authenticity: S/R, horizon: L/C — with the
 *  threshold at 6 (1–5 left letter, 6–10 right letter), matching
 *  the bar visualisation's centre at 5. The blurb fills all three
 *  axis-profile slots so the expanded axis cards still have copy. */
function entityToRQResult(entity: MarketplaceEntity): RQResult {
  const toScore = (t: number) =>
    Math.max(1, Math.min(10, Math.round(t / 10)));
  const toBand = (s: number): string =>
    s <= 3 ? "1\u20133" : s <= 6 ? "4\u20136" : "7\u201310";
  const v = toScore(entity.traits.values);
  const a = toScore(entity.traits.authenticity);
  const h = toScore(entity.traits.horizon);
  return {
    rq: entity.rq_code,
    rqName: entity.rq_name,
    details: {
      values: { letter: v >= 6 ? "F" : "I", score: v, band: toBand(v) },
      authenticity: { letter: a >= 6 ? "R" : "S", score: a, band: toBand(a) },
      horizon: { letter: h >= 6 ? "C" : "L", score: h, band: toBand(h) },
    },
    profile: {
      values: entity.blurb,
      authenticity: entity.blurb,
      horizon: entity.blurb,
    },
  };
}

type Props = {
  matches: Match[];
  /** Pool entities to render. The marketplace page passes graduated
      leads from /admin/leads (via `became_member_at`); seed mocks
      were removed from this surface. Defaults to an empty array so
      the component still renders if a caller forgets to pass it. */
  entities?: readonly MarketplaceEntity[];
  /** Source members upstreamed from /api/members. The expanded row
      uses these to look up the underlying lifecycle_steps + signing
      date for the Membership block shown above the Signal Profile.
      Mock entities don't have a corresponding Member; the block is
      skipped for them. */
  members?: readonly Member[];
  /** Save a partial member back to the API. Used by the step
      checkboxes in the Membership block. */
  onMemberPatch?: (
    memberId: string,
    partial: MemberWritable,
  ) => Promise<boolean>;
  /** Create a new member who graduates straight into the pool — POST
      with `became_member_at` set so the row surfaces here on the next
      paint. Returns the created member (or null on failure) so the
      pool can scroll-to/expand the new row. */
  onCreateMember?: (input: MemberWritable) => Promise<Member | null>;
};

type KindFilter = "all" | "brand" | "creator";
type MatchedFilter = "all" | "matched" | "unmatched";

/** Extract the underlying member.id from a MarketplaceEntity id. Real
 *  members get prefixed with `mem-` when converted via
 *  memberToMarketplaceEntity; mock entities use the c-NN / b-NN
 *  shorthand and return null here. */
function entityToMemberId(entityId: string): string | null {
  return entityId.startsWith("mem-") ? entityId.slice(4) : null;
}

// Stable empty default so the prop never falls back to a recreated
// array each render (which would re-fire downstream useMemos).
const EMPTY_ENTITIES: readonly MarketplaceEntity[] = [];

export function PoolView({
  matches,
  entities = EMPTY_ENTITIES,
  members,
  onMemberPatch,
  onCreateMember,
}: Props) {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [matchedFilter, setMatchedFilter] = useState<MatchedFilter>("all");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  // Full-edit modal — drives the "Edit member" button on each expanded
  // pool row. Captures every member field (identity, status, shipping
  // address). Distinct from the inline edits in MarketplaceMemberDetails
  // / MembershipBlock which auto-save individual fields without a modal.
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  // Add-member modal state. Kept here (rather than in MarketplacePage)
  // because the form + scroll-to-new-row UX is local to the pool.
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addType, setAddType] = useState<MemberType>("creator");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addOrg, setAddOrg] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  // Map entity-id → number of confirmed pairings, so we can show a
  // "matched N" pill in the table without re-walking the matches list
  // per row.
  const pairingsById = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) {
      counts.set(m.brand_id, (counts.get(m.brand_id) ?? 0) + 1);
      counts.set(m.creator_id, (counts.get(m.creator_id) ?? 0) + 1);
    }
    return counts;
  }, [matches]);

  const filtered = useMemo<MarketplaceEntity[]>(() => {
    const q = search.trim().toLowerCase();
    return entities.filter((e) => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (matchedFilter !== "all") {
        const isMatched = (pairingsById.get(e.id) ?? 0) > 0;
        if (matchedFilter === "matched" && !isMatched) return false;
        if (matchedFilter === "unmatched" && isMatched) return false;
      }
      if (q) {
        if (
          !e.name.toLowerCase().includes(q) &&
          !(e.organization ?? "").toLowerCase().includes(q) &&
          !e.rq_code.toLowerCase().includes(q) &&
          !e.rq_name.toLowerCase().includes(q) &&
          !e.tags.some((t) => t.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [entities, search, kindFilter, matchedFilter, pairingsById]);

  // member.id → Member, for the Lifecycle column (render + progress sort).
  const memberById = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members ?? []) map.set(m.id, m);
    return map;
  }, [members]);

  // Onboarding progress as a fraction (0–1) for the Lifecycle sort;
  // entities with no underlying member (mocks) sort to the bottom.
  const lifecycleRank = (e: MarketplaceEntity): number => {
    const memberId = entityToMemberId(e.id);
    const member = memberId ? memberById.get(memberId) : null;
    if (!member) return -1;
    const { done, total } = countMarketplaceCompleted(
      member.lifecycle_steps,
      member.member_type,
    );
    return total === 0 ? 0 : done / total;
  };

  const columns: Column<MarketplaceEntity>[] = [
    {
      key: "organization",
      header: "Organization",
      variant: "truncate",
      // Empty organizations sort to the bottom on asc (mocks / org-less
      // members park at the end) and to the top on desc.
      sort: (a, b) => {
        const av = a.organization ?? "";
        const bv = b.organization ?? "";
        if (av === "" && bv !== "") return 1;
        if (bv === "" && av !== "") return -1;
        return av.localeCompare(bv);
      },
      cell: (e) => e.organization || "—",
    },
    {
      key: "name",
      header: "Name",
      sort: (a, b) => a.name.localeCompare(b.name),
      cell: (e) => (
        <div className={styles.poolNameCell}>
          <span className={styles.poolName}>{e.name}</span>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Type",
      width: "100px",
      cell: (e) => (
        <Badge variant={typeVariant(e.kind)}>
          {e.kind === "creator" ? "Creator" : "Brand"}
        </Badge>
      ),
    },
    {
      key: "rq",
      header: "RQ",
      cell: (e) => (
        <div className={styles.rqCell}>
          <span className={styles.rqCode}>{e.rq_code}</span>
          <span className={styles.rqName}>{e.rq_name}</span>
        </div>
      ),
    },
    {
      // Compact lifecycle stepper — pip-bar + "X/Y · Phase · Next step"
      // label, so the table doubles as an at-a-glance onboarding worklist.
      // Mocks have no underlying member and show "—".
      key: "status",
      header: "Lifecycle",
      // Sort by onboarding progress (fraction of applicable steps done);
      // toggle the header to descending to surface the most-onboarded.
      sort: (a, b) => lifecycleRank(a) - lifecycleRank(b),
      cell: (e) => {
        const memberId = entityToMemberId(e.id);
        const member = memberId ? memberById.get(memberId) : null;
        if (!member) {
          return <span className={styles.poolStatusEmpty}>—</span>;
        }
        return <LifecycleStepper member={member} variant="compact" />;
      },
    },
    {
      key: "tags",
      header: "Tags",
      cell: (e) => (
        <div className={styles.tagRow}>
          {e.tags.slice(0, 3).map((t) => (
            <span key={t} className={styles.tagChip}>
              {t}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "matches",
      header: "Matched",
      width: "90px",
      variant: "numeric",
      cell: (e) => {
        const n = pairingsById.get(e.id) ?? 0;
        return n > 0 ? (
          <Badge variant="success">{n}</Badge>
        ) : (
          <span className={styles.poolMatchEmpty}>—</span>
        );
      },
    },
    {
      key: "expand",
      header: "",
      width: "32px",
      variant: "numeric",
      cell: (e) => (
        <span className={styles.poolExpandGlyph}>
          {expandedRow === e.id ? "−" : "+"}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.poolView}>
      <div className={styles.poolToolbar}>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, RQ, or tag…"
        />
        {onCreateMember && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setAddError(null);
              setIsAddOpen(true);
            }}
          >
            + Add member
          </Button>
        )}
        <div className={styles.filterChips}>
          <FilterChipGroup
            label="Kind"
            value={kindFilter}
            options={[
              { id: "all", label: "All" },
              { id: "brand", label: "Brands" },
              { id: "creator", label: "Creators" },
            ]}
            onChange={(v) => setKindFilter(v as KindFilter)}
          />
          <FilterChipGroup
            label="Match status"
            value={matchedFilter}
            options={[
              { id: "all", label: "Any" },
              { id: "matched", label: "Matched" },
              { id: "unmatched", label: "Unmatched" },
            ]}
            onChange={(v) => setMatchedFilter(v as MatchedFilter)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          message="No entities match those filters."
        />
      ) : (
        <DataTable
          rows={filtered}
          columns={columns}
          expandedRowId={expandedRow}
          onToggleRow={(id) =>
            setExpandedRow((prev) => (prev === id ? null : id))
          }
          renderExpanded={(e) => {
            const result = entityToRQResult(e);
            const memberId = entityToMemberId(e.id);
            const sourceMember =
              memberId && members
                ? members.find((m) => m.id === memberId)
                : null;
            const patchStep = async (stepKey: string, nextDone: boolean) => {
              if (!sourceMember || !onMemberPatch) return;
              const today = new Date().toISOString().slice(0, 10);
              const stored = sourceMember.lifecycle_steps?.[stepKey];
              const merged: LifecycleSteps = {
                ...(sourceMember.lifecycle_steps ?? {}),
                [stepKey]: {
                  status: (nextDone ? "done" : "todo") as StepStatus,
                  completed_at: nextDone
                    ? (stored?.completed_at ?? today)
                    : null,
                },
              };
              await onMemberPatch(sourceMember.id, {
                lifecycle_steps: merged,
              });
            };
            return (
              <>
                {/* 0. Full-edit action — opens the modal with every
                       member field (identity, status, shipping). The
                       inline cards below auto-save individual fields;
                       this is for bulk edits + the shipping address. */}
                {sourceMember && onMemberPatch && (
                  <div className={styles.mmActionsRow}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditError(null);
                        setEditingMemberId(sourceMember.id);
                      }}
                    >
                      Edit member
                    </Button>
                  </div>
                )}

                {/* 1. Lifecycle stepper — promoted to the top of the
                       panel as the most important "where are we / what's
                       next" signal. Clicking a circle toggles done/undo.
                       The detailed checklist (with owner role + per-step
                       date) lives further down inside a collapsible. */}
                {sourceMember && onMemberPatch && (
                  <LifecycleStepper
                    member={sourceMember}
                    variant="full"
                    onToggle={patchStep}
                  />
                )}

                {sourceMember &&
                  onMemberPatch &&
                  sourceMember.member_type === "creator" && (
                    <Art19MigrationChecklist
                      member={sourceMember}
                      onToggle={patchStep}
                    />
                  )}

                {/* 2. Member details — ContactCard + editable outreach
                       fields. Real members only. */}
                {sourceMember && onMemberPatch && (
                  <MarketplaceMemberDetails
                    member={sourceMember}
                    onPatch={onMemberPatch}
                  />
                )}

                {/* 2b. XQ summary — surfaced when the member has a
                       linked Conviction Quotient submission (set by
                       the /xq-quiz POST's email-link best-effort).
                       Renders nothing when not linked. */}
                {sourceMember && sourceMember.xq_submission_id && (
                  <XQSummaryCard submissionId={sourceMember.xq_submission_id} />
                )}

                {/* 3. Comments. The legacy MembershipBlock checkbox
                       checklist was retired now that the LifecycleStepper
                       at the top of the panel is the single source of
                       per-step interaction. */}
                {sourceMember && (
                  <MarketplaceMemberComments memberId={sourceMember.id} />
                )}

                {/* 3. Signal Profile — bottom of the panel, with a
                       big full-width button-style summary so the
                       click target reads unambiguously as an action
                       (not a quiet collapsible). `<details>` still
                       owns the open/closed state — no JS plumbing. */}
                <details className={styles.poolGraphBlock}>
                  <summary className={styles.poolGraphSummary}>
                    <span className={styles.poolGraphSummaryLabel}>
                      Signal Profile
                    </span>
                    <span
                      className={styles.poolGraphSummaryHint}
                      aria-hidden="true"
                    >
                      <span className={styles.poolGraphSummaryClosed}>
                        Click to view ▾
                      </span>
                      <span className={styles.poolGraphSummaryOpen}>
                        Hide ▴
                      </span>
                    </span>
                  </summary>
                  <div className={styles.poolGraphScope}>
                    <RQResultsGraph result={result} />
                  </div>
                </details>
              </>
            );
          }}
        />
      )}

      {/* Add-member modal — surface for graduating a person directly
          into the pool without going through /admin/leads first. POSTs
          to /api/members via the parent's onCreateMember with
          `became_member_at` set so the row appears in the pool
          immediately. */}
      {onCreateMember && (
        <Modal
          open={isAddOpen}
          onClose={() => {
            if (!addSaving) setIsAddOpen(false);
          }}
          dismissible={!addSaving}
          size="md"
          title="Add member to pool"
          subtitle="Creates a graduated member directly — they'll appear in the pool below."
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setIsAddOpen(false)}
                disabled={addSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="mm-add-member-form"
                disabled={addSaving}
              >
                {addSaving ? "Adding…" : "Add to pool"}
              </Button>
            </>
          }
        >
          <form
            id="mm-add-member-form"
            className={styles.mmAddForm}
            onSubmit={async (ev) => {
              ev.preventDefault();
              if (addSaving) return;
              const first = addFirstName.trim();
              const last = addLastName.trim();
              const org = addOrg.trim();
              const email = addEmail.trim();
              if (!first && !last && !org) {
                setAddError(
                  "Add a name or an organization so the row has something to render.",
                );
                return;
              }
              setAddError(null);
              setAddSaving(true);
              const created = await onCreateMember({
                first_name: first || null,
                last_name: last || null,
                organization: org || null,
                email: email || null,
                member_type: addType,
                became_member_at: new Date().toISOString(),
              });
              setAddSaving(false);
              if (created) {
                setIsAddOpen(false);
                setAddFirstName("");
                setAddLastName("");
                setAddOrg("");
                setAddEmail("");
                // Surface the new row immediately — scroll + expand.
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    const row = document.querySelector<HTMLElement>(
                      `tr[data-row-id="${CSS.escape(`mem-${created.id}`)}"]`,
                    );
                    row?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                });
                setExpandedRow(`mem-${created.id}`);
              } else {
                setAddError("Failed to add member. Try again or check the server logs.");
              }
            }}
          >
            <div className={styles.mmAddFormRow}>
              <label className={styles.mmAddFormField}>
                <span>Type</span>
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as MemberType)}
                  disabled={addSaving}
                >
                  <option value="creator">Creator</option>
                  <option value="brand">Brand</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>
            <div className={styles.mmAddFormRow}>
              <label className={styles.mmAddFormField}>
                <span>First name</span>
                <input
                  type="text"
                  value={addFirstName}
                  onChange={(e) => setAddFirstName(e.target.value)}
                  disabled={addSaving}
                  autoFocus
                />
              </label>
              <label className={styles.mmAddFormField}>
                <span>Last name</span>
                <input
                  type="text"
                  value={addLastName}
                  onChange={(e) => setAddLastName(e.target.value)}
                  disabled={addSaving}
                />
              </label>
            </div>
            <div className={styles.mmAddFormRow}>
              <label className={styles.mmAddFormField}>
                <span>Organization</span>
                <input
                  type="text"
                  value={addOrg}
                  onChange={(e) => setAddOrg(e.target.value)}
                  disabled={addSaving}
                />
              </label>
              <label className={styles.mmAddFormField}>
                <span>Email</span>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  disabled={addSaving}
                />
              </label>
            </div>
            {addError && (
              <p className={styles.mmAddFormError}>{addError}</p>
            )}
          </form>
        </Modal>
      )}

      {/* Full-edit modal — wired to the "Edit member" button on each
          expanded pool row. Reuses the same component the Contacts
          page uses, so both surfaces share field coverage (incl. the
          shipping-address section). `key` keyed on the editing member
          id so opening the modal against a different member remounts
          it with the new source data (initial-state-from-props
          pattern). */}
      <MemberEditModal
        key={editingMemberId ?? "closed"}
        open={editingMemberId !== null}
        member={
          editingMemberId && members
            ? members.find((m) => m.id === editingMemberId) ?? null
            : null
        }
        isSaving={editSaving}
        errorMessage={editError}
        onClose={() => {
          if (!editSaving) {
            setEditingMemberId(null);
            setEditError(null);
          }
        }}
        onSave={async (payload) => {
          if (!editingMemberId || !onMemberPatch) return;
          setEditSaving(true);
          setEditError(null);
          const ok = await onMemberPatch(editingMemberId, payload);
          setEditSaving(false);
          if (ok) {
            setEditingMemberId(null);
          } else {
            setEditError("Couldn't save. Try again.");
          }
        }}
      />
    </div>
  );
}

/* =====================================================================
 * FilterChipGroup — reusable little segmented control. Extracted here
 * since the same shape appears in MatchBoard's tier filter too.
 * ===================================================================== */

type FilterOption = { id: string; label: string };

function FilterChipGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (id: string) => void;
}) {
  return (
    <div className={styles.filterChipGroup}>
      <span className={styles.filterChipGroupLabel}>{label}</span>
      <div className={styles.filterChipRow} role="tablist" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={value === o.id}
            className={`${styles.filterChip} ${
              value === o.id ? styles.filterChipActive : ""
            }`}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { FilterChipGroup };
