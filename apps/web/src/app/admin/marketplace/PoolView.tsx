"use client";

import { useCallback, useMemo, useState } from "react";

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
  daysSince,
  LIFECYCLE_STEPS,
  MARKETPLACE_LIFECYCLE_KEYS,
  MEMBER_PHASE_LABELS,
  type LifecycleSteps,
  type Member,
  type MemberPhase,
  type MemberType,
  type MemberWritable,
  type StepStatus,
} from "@/lib/members";

import { MemberEditModal } from "../components/MemberEditModal";

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

/* =====================================================================
 * Marketplace urgency — who in the pool needs attention right now?
 *
 * A real member is urgent when:
 *   - they're an active marketplace participant (graduated, and not
 *     paused / churned), AND
 *   - at least one applicable marketplace lifecycle step (Sign /
 *     Onboard / Run, skipping creator-only steps for brands) is still
 *     incomplete, AND
 *   - either no last contact recorded OR last contact ≥ URGENT_DAYS
 *     ago.
 *
 * Members with all steps done are no longer urgent regardless of
 * contact recency — there's nothing for the team to act on.
 * ===================================================================== */

const URGENT_DAYS = 7;

function nextPendingStep(m: Member) {
  const stepKeys = new Set(MARKETPLACE_LIFECYCLE_KEYS);
  return LIFECYCLE_STEPS.find((s) => {
    if (!stepKeys.has(s.key)) return false;
    if (s.creatorOnly && m.member_type !== "creator") return false;
    return m.lifecycle_steps?.[s.key]?.status !== "done";
  });
}

function isMemberUrgent(m: Member): boolean {
  if (!m.became_member_at) return false;
  if (m.phase === "paused" || m.phase === "churned") return false;
  if (!nextPendingStep(m)) return false; // all steps done
  const d = daysSince(m.last_contact_at);
  return d === null || d >= URGENT_DAYS;
}

/** Sentinel-high for never-contacted so they sort to the top, then
 *  days-since-last-contact descending. */
function memberUrgencyScore(m: Member): number {
  const d = daysSince(m.last_contact_at);
  return d === null ? Number.MAX_SAFE_INTEGER : d;
}

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

  // Urgent members — computed from the unfiltered `members` list so
  // the banner is always visible regardless of pool filters. Mirrors
  // the leads-page banner: founders should see what needs action up
  // top no matter how they're slicing the rest of the view.
  const urgentMembers = useMemo(() => {
    if (!members) return [];
    return [...members]
      .filter(isMemberUrgent)
      .sort((a, b) => memberUrgencyScore(b) - memberUrgencyScore(a));
  }, [members]);

  // Click an urgent row → clear filters so the underlying pool row is
  // visible, expand it, scroll into view. Double-rAF ensures we measure
  // after React commits + the browser paints.
  const openMember = useCallback(
    (memberId: string) => {
      setSearch("");
      setKindFilter("all");
      setMatchedFilter("all");
      setExpandedRow(`mem-${memberId}`);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const row = document.querySelector<HTMLElement>(
            `tr[data-row-id="${CSS.escape(`mem-${memberId}`)}"]`,
          );
          row?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    },
    [],
  );

  // "Resolved" → bump last_contact_at to now. Drops the row off the
  // banner via the recomputed urgentMembers (since daysSince becomes
  // 0). Same pattern leads page uses.
  const resolveMember = useCallback(
    (memberId: string) => {
      if (!onMemberPatch) return;
      void onMemberPatch(memberId, {
        last_contact_at: new Date().toISOString(),
      });
    },
    [onMemberPatch],
  );

  const columns: Column<MarketplaceEntity>[] = [
    {
      key: "name",
      header: "Name",
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
      // Replaces the prior Values / Authenticity / Horizon trait
      // columns. Surfaces the next pending lifecycle step for real
      // members (looked up via the `mem-` id prefix in
      // entityToMemberId), so the table doubles as an onboarding
      // worklist. Mocks have no underlying member and show "—".
      key: "status",
      header: "Next action",
      cell: (e) => {
        const memberId = entityToMemberId(e.id);
        const member =
          memberId && members ? members.find((m) => m.id === memberId) : null;
        if (!member) {
          return <span className={styles.poolStatusEmpty}>—</span>;
        }

        // Walk the marketplace slice of LIFECYCLE_STEPS in order;
        // first step that's neither done nor N/A is the next action.
        const stepKeys = new Set(MARKETPLACE_LIFECYCLE_KEYS);
        const nextStep = LIFECYCLE_STEPS.find((s) => {
          if (!stepKeys.has(s.key)) return false;
          if (s.creatorOnly && member.member_type !== "creator") return false;
          const stored = member.lifecycle_steps?.[s.key];
          return stored?.status !== "done";
        });

        if (!nextStep) {
          return (
            <span className={styles.poolStatusCell}>
              <Badge variant="success">All steps complete</Badge>
            </span>
          );
        }

        return (
          <span className={styles.poolStatusCell}>
            <Badge variant="info">
              {MEMBER_PHASE_LABELS[nextStep.phase]}
            </Badge>
            <span className={styles.poolStatusLabel}>{nextStep.label}</span>
          </span>
        );
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
      <MarketplaceUrgentBanner
        urgent={urgentMembers}
        onOpenMember={openMember}
        onResolveMember={resolveMember}
      />

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

                {/* 1. Member details — replicates the leads card:
                       ContactCard + editable outreach fields (owner,
                       last contact w/ date picker, times contacted,
                       last response, notes). Real members only. */}
                {sourceMember && onMemberPatch && (
                  <MarketplaceMemberDetails
                    member={sourceMember}
                    onPatch={onMemberPatch}
                  />
                )}

                {/* 2. Lifecycle checklist + Comments thread side-by-
                       side — same arrangement leads page uses on its
                       bottom row. Real members only. */}
                {sourceMember && (
                  <div className={styles.mmLifecycleCommentsGrid}>
                    {onMemberPatch && (
                      <MembershipBlock
                        member={sourceMember}
                        onPatch={onMemberPatch}
                      />
                    )}
                    <MarketplaceMemberComments memberId={sourceMember.id} />
                  </div>
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

/* =====================================================================
 * MarketplaceLifecycleChecklist — mimics the leads-page
 * LifecycleChecklist exactly (progress pill, phase badges, step rows
 * with role tag + completion date) but scoped to the marketplace slice
 * of LIFECYCLE_STEPS (Sign / Onboard / Run). Renders inside the
 * Lifecycle + Comments side-by-side grid on the expanded pool row.
 * ===================================================================== */

const MARKETPLACE_PHASES_IN_ORDER: MemberPhase[] = ["sign", "onboard", "run"];

function phaseVariantInline(phase: MemberPhase) {
  switch (phase) {
    case "sign":
      return "warn" as const;
    case "onboard":
      return "warn" as const;
    case "run":
      return "success" as const;
    default:
      return "neutral" as const;
  }
}

function formatStepDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type MembershipBlockProps = {
  member: Member;
  onPatch: (memberId: string, partial: MemberWritable) => Promise<boolean>;
};

function MembershipBlock({ member, onPatch }: MembershipBlockProps) {
  const stepKeys = new Set(MARKETPLACE_LIFECYCLE_KEYS);
  const marketplaceSteps = LIFECYCLE_STEPS.filter((s) => stepKeys.has(s.key));

  // Group by phase for the per-phase render below.
  const byPhase = new Map<MemberPhase, typeof LIFECYCLE_STEPS>();
  for (const step of marketplaceSteps) {
    const list = (byPhase.get(step.phase) ?? []) as typeof LIFECYCLE_STEPS;
    byPhase.set(step.phase, [...list, step] as typeof LIFECYCLE_STEPS);
  }

  // Progress count — N/A steps (creator-only on a brand) don't count
  // toward either done or total. Same logic the leads LifecycleChecklist
  // uses via countCompleted in @/lib/members.
  let done = 0;
  let total = 0;
  for (const step of marketplaceSteps) {
    if (step.creatorOnly && member.member_type !== "creator") continue;
    total += 1;
    if (member.lifecycle_steps?.[step.key]?.status === "done") done += 1;
  }
  const isFull = total > 0 && done === total;

  const handleToggle = async (stepKey: string, isDone: boolean) => {
    const today = new Date().toISOString().slice(0, 10);
    const stored = member.lifecycle_steps?.[stepKey];
    const merged: LifecycleSteps = {
      ...(member.lifecycle_steps ?? {}),
      [stepKey]: {
        status: (isDone ? "done" : "todo") as StepStatus,
        completed_at: isDone ? (stored?.completed_at ?? today) : null,
      },
    };
    await onPatch(member.id, { lifecycle_steps: merged });
  };

  return (
    <section className={styles.mmLifecycleBlock} aria-label="Lifecycle">
      <h4 className={styles.mmLifecycleTitle}>
        Lifecycle
        <span
          className={[
            styles.mmProgressPill,
            isFull ? styles.mmProgressPillFull : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {done}/{total}
        </span>
      </h4>

      {MARKETPLACE_PHASES_IN_ORDER.map((phaseKey) => {
        const steps = byPhase.get(phaseKey);
        if (!steps || steps.length === 0) return null;
        return (
          <div key={phaseKey} className={styles.mmPhaseGroup}>
            <div className={styles.mmPhaseGroupHeader}>
              <Badge variant={phaseVariantInline(phaseKey)}>
                {MEMBER_PHASE_LABELS[phaseKey]}
              </Badge>
            </div>
            <div className={styles.mmStepList}>
              {steps.map((step) => {
                const stored = member.lifecycle_steps?.[step.key];
                const isNa =
                  step.creatorOnly && member.member_type !== "creator";
                const status: StepStatus = stored?.status ?? "todo";
                const isDone = status === "done";
                const rowCls = [
                  styles.mmStepRow,
                  isNa ? styles.mmStepRowNa : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const labelCls = [
                  styles.mmStepLabel,
                  isDone ? styles.mmStepLabelDone : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <label key={step.key} className={rowCls}>
                    <input
                      type="checkbox"
                      className={styles.mmStepCheckbox}
                      checked={isDone}
                      disabled={isNa}
                      onChange={(ev) =>
                        void handleToggle(step.key, ev.target.checked)
                      }
                    />
                    <span className={labelCls}>
                      {step.label}
                      {isNa && " (N/A)"}
                    </span>
                    <span className={styles.mmStepRoleTag}>
                      {step.ownerRole}
                    </span>
                    <span className={styles.mmStepDate}>
                      {isDone ? formatStepDate(stored?.completed_at) : ""}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* =====================================================================
 * MarketplaceUrgentBanner — top-of-pool priority list. Mirrors the
 * leads-page banner: red destructive-soft card, one row per urgent
 * member, click row to open in the table below, "Resolved" button
 * bumps last_contact_at to today. Renders nothing when no urgent
 * members.
 * ===================================================================== */

type UrgentBannerProps = {
  urgent: Member[];
  onOpenMember: (memberId: string) => void;
  onResolveMember: (memberId: string) => void;
};

function MarketplaceUrgentBanner({
  urgent,
  onOpenMember,
  onResolveMember,
}: UrgentBannerProps) {
  if (urgent.length === 0) return null;

  return (
    <section className={styles.mmUrgentBanner} aria-label="Urgent members">
      <header className={styles.mmUrgentHeader}>
        <span className={styles.mmUrgentIcon} aria-hidden="true">
          !
        </span>
        <h3 className={styles.mmUrgentTitle}>
          {urgent.length}{" "}
          {urgent.length === 1 ? "member needs" : "members need"} urgent action
        </h3>
        <span className={styles.mmUrgentSub}>
          No contact in {URGENT_DAYS}+ days · onboarding still open
        </span>
      </header>
      <ul className={styles.mmUrgentList}>
        {urgent.map((m) => {
          const d = daysSince(m.last_contact_at);
          const stale =
            d === null ? "Never contacted" : `${d}d since last contact`;
          const next = nextPendingStep(m);
          const name =
            [m.first_name, m.last_name].filter(Boolean).join(" ").trim() ||
            m.organization ||
            "(unnamed)";
          return (
            <li key={m.id} className={styles.mmUrgentItemRow}>
              <button
                type="button"
                className={styles.mmUrgentItem}
                onClick={() => onOpenMember(m.id)}
              >
                <span className={styles.mmUrgentItemName}>{name}</span>
                {next && (
                  <Badge
                    variant={
                      next.phase === "run"
                        ? "success"
                        : ("warn" as const)
                    }
                  >
                    {MEMBER_PHASE_LABELS[next.phase]}
                  </Badge>
                )}
                <span className={styles.mmUrgentItemNext}>
                  {next ? `→ ${next.label}` : "All steps complete"}
                </span>
                <span className={styles.mmUrgentItemStale}>{stale}</span>
                <span className={styles.mmUrgentItemMeta}>
                  {m.owner ?? "—"}
                </span>
              </button>
              <button
                type="button"
                className={styles.mmUrgentResolveBtn}
                onClick={() => onResolveMember(m.id)}
                title="Mark resolved — bumps Last contact to today, dropping it off the urgent list."
              >
                Resolved
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

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
