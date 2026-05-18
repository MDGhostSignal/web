"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { Badge, type BadgeVariant, Button } from "@/components/admin";
import {
  type Member,
  type MemberPhase,
  type MemberWritable,
  MEMBER_OWNERS,
  MEMBER_PHASE_LABELS,
  MEMBER_TYPE_LABELS,
} from "@/lib/members";

import styles from "./marketplace.module.css";

/* =====================================================================
 * Marketplace member details — replicates the contact / pipeline /
 * comments cards from /admin/leads so the pool expanded row carries
 * the same operational surface for full GhostSignal members. Shares
 * the existing onMemberPatch callback from MarketplacePage for saves.
 * ===================================================================== */

type Props = {
  member: Member;
  onPatch: (memberId: string, partial: MemberWritable) => Promise<boolean>;
};

/** Render-phase compare-and-set keeps each draft in sync with upstream
 *  member echoes after a successful PATCH. Same pattern leads page
 *  uses (avoids react-hooks/set-state-in-effect). */
function useDraftSync<T>(upstream: T): [T, (next: T) => void] {
  const [draft, setDraft] = useState<T>(upstream);
  const [lastSeen, setLastSeen] = useState<T>(upstream);
  if (upstream !== lastSeen) {
    setLastSeen(upstream);
    setDraft(upstream);
  }
  return [draft, setDraft];
}

function formatDateLong(value: string | null | undefined): string {
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
  return `${first} ${last}`.trim() || m.organization || "(unnamed)";
}

/** Same phase → admin Badge variant mapping the leads page uses. Kept
 *  inline rather than imported because the leads file doesn't export
 *  it and the user wants leads code left untouched. */
function phaseVariant(phase: MemberPhase): BadgeVariant {
  switch (phase) {
    case "discern": return "info";
    case "court": return "accent";
    case "sign": return "warn";
    case "onboard": return "warn";
    case "run": return "success";
    case "paused": return "neutral";
    case "churned": return "danger";
  }
}

export function MarketplaceMemberDetails({ member, onPatch }: Props) {
  return (
    <div className={styles.mmDetailsGrid}>
      <ContactCard member={member} />
      <PipelineCard member={member} onPatch={onPatch} />
    </div>
  );
}

/* ---- Contact card --------------------------------------------------- */

function ContactCard({ member }: { member: Member }) {
  const name = fullName(member);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className={styles.mmContactCard} aria-label="Contact details">
      <div className={styles.mmContactHeader}>
        <div className={styles.mmContactAvatar} aria-hidden="true">
          {initials || "—"}
        </div>
        <div className={styles.mmContactHeaderText}>
          <div className={styles.mmContactName}>{name}</div>
          <div className={styles.mmContactSub}>
            <Badge variant={member.member_type === "creator" ? "creator" : "brand"}>
              {MEMBER_TYPE_LABELS[member.member_type]}
            </Badge>
            {member.role && (
              <span className={styles.mmContactRole}>{member.role}</span>
            )}
          </div>
        </div>
      </div>
      <dl className={styles.mmContactFields}>
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
      </dl>
    </section>
  );
}

/* ---- Pipeline card — read-only metadata + editable fields + notes --
   Mirrors the leads PipelineCard layout: a Phase / Next step / Added /
   Signed dl at the top, then an inline-fields grid (Owner / Last
   contact / Times contacted / Last response), then a notes textarea.
   Shared "Saving…/Saved/Failed" pill in the card header covers every
   editable field. */

function PipelineCard({ member, onPatch }: Props) {
  const [draftOwner, setDraftOwner] = useDraftSync(member.owner ?? "");
  const [draftLastContact, setDraftLastContact] = useDraftSync(
    member.last_contact_at ? member.last_contact_at.slice(0, 10) : "",
  );
  const [draftCount, setDraftCount] = useDraftSync(
    member.contact_count === null || member.contact_count === undefined
      ? ""
      : String(member.contact_count),
  );
  const [draftResponse, setDraftResponse] = useDraftSync(
    member.last_response ?? "",
  );
  const [draftNotes, setDraftNotes] = useDraftSync(member.notes ?? "");
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const runSave = async (partial: MemberWritable) => {
    setStatus("saving");
    const ok = await onPatch(member.id, partial);
    if (ok) {
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } else {
      setStatus("error");
    }
  };

  const handleOwnerChange = (next: string) => {
    setDraftOwner(next);
    const normalized = next === "" ? null : next;
    if (normalized === (member.owner ?? null)) return;
    void runSave({ owner: normalized });
  };

  const handleLastContactChange = (next: string) => {
    setDraftLastContact(next);
    const current = member.last_contact_at
      ? member.last_contact_at.slice(0, 10)
      : "";
    if (next === current) return;
    void runSave({ last_contact_at: next === "" ? null : next });
  };

  const handleCountBlur = () => {
    const trimmed = draftCount.trim();
    let nextValue: number | null;
    if (trimmed === "") {
      nextValue = null;
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) return;
      nextValue = Math.floor(n);
    }
    if (nextValue === (member.contact_count ?? null)) return;
    void runSave({ contact_count: nextValue });
  };

  const handleResponseBlur = () => {
    if (draftResponse === (member.last_response ?? "")) return;
    void runSave({ last_response: draftResponse });
  };

  const handleNotesBlur = () => {
    if (draftNotes === (member.notes ?? "")) return;
    void runSave({ notes: draftNotes });
  };

  return (
    <section className={styles.mmPipelineCard} aria-label="Pipeline">
      <div className={styles.mmCardHeader}>
        <span>Pipeline</span>
        <span className={styles.mmCardStatus} aria-live="polite">
          {status === "saving" && "Saving…"}
          {status === "saved" && "Saved"}
          {status === "error" && "Failed to save"}
        </span>
      </div>

      <dl className={styles.mmPipelineFields}>
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
          <dd>{formatDateLong(member.created_at)}</dd>
        </div>
        <div>
          <dt>Signed</dt>
          <dd>{formatDateLong(member.became_member_at)}</dd>
        </div>
      </dl>

      <div className={styles.mmInlineFields}>
        <label className={styles.mmInlineField}>
          <span className={styles.mmInlineLabel}>Owner</span>
          <select
            className={styles.mmInlineInput}
            value={draftOwner}
            onChange={(e) => handleOwnerChange(e.target.value)}
          >
            <option value="">—</option>
            {MEMBER_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.mmInlineField}>
          <span className={styles.mmInlineLabel}>Last contact</span>
          <input
            type="date"
            className={styles.mmInlineInput}
            value={draftLastContact}
            onChange={(e) => handleLastContactChange(e.target.value)}
          />
        </label>
        <label className={styles.mmInlineField}>
          <span className={styles.mmInlineLabel}>Times contacted</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className={styles.mmInlineInput}
            value={draftCount}
            onChange={(e) => setDraftCount(e.target.value)}
            onBlur={handleCountBlur}
            placeholder="0"
          />
        </label>
        <label className={styles.mmInlineField}>
          <span className={styles.mmInlineLabel}>Last response</span>
          <input
            type="text"
            className={styles.mmInlineInput}
            value={draftResponse}
            onChange={(e) => setDraftResponse(e.target.value)}
            onBlur={handleResponseBlur}
            placeholder="What did they say last?"
          />
        </label>
      </div>

      <div className={styles.mmNotesField}>
        <span className={styles.mmInlineLabel}>Notes</span>
        <textarea
          className={styles.mmNotesTextarea}
          value={draftNotes}
          onChange={(e) => setDraftNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Onboarding notes, delivery details, internal context…"
          rows={4}
        />
      </div>
    </section>
  );
}

/* ---- Comments thread ------------------------------------------------ */

type MemberComment = {
  id: string;
  member_id: string;
  author: string;
  content: string;
  created_at: string;
};

function formatStamp(iso: string): string {
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

export function MarketplaceMemberComments({ memberId }: { memberId: string }) {
  const [comments, setComments] = useState<MemberComment[]>([]);
  const [draft, setDraft] = useState("");
  const [author, setAuthor] = useState<string>(MEMBER_OWNERS[0]);
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/members/comments?member_id=${memberId}`,
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.comments)) {
        setComments(data.comments as MemberComment[]);
      }
    } catch {
      /* best-effort */
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const content = draft.trim();
    if (!content || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/members/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, author, content }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.comment) {
        setComments((prev) => [data.comment as MemberComment, ...prev]);
        setDraft("");
      }
    } finally {
      setPosting(false);
    }
  };

  return (
    <section className={styles.mmCommentsCard} aria-label="Comments">
      <div className={styles.mmCardHeader}>
        <span>Comments</span>
        <span className={styles.mmCardSub}>
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      <form className={styles.mmCommentForm} onSubmit={handleSubmit}>
        <select
          className={styles.mmCommentAuthor}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          aria-label="Comment author"
        >
          {MEMBER_OWNERS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <textarea
          className={styles.mmCommentTextarea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment about this member…"
        />
        <div className={styles.mmCommentFormFooter}>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={posting || draft.trim().length === 0}
          >
            {posting ? "Posting…" : "Post"}
          </Button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className={styles.mmCommentEmpty}>No comments yet.</p>
      ) : (
        <ul className={styles.mmCommentList}>
          {comments.map((c) => (
            <li key={c.id} className={styles.mmCommentItem}>
              <div className={styles.mmCommentHead}>
                <strong>{c.author}</strong>
                <span className={styles.mmCommentStamp}>
                  {formatStamp(c.created_at)}
                </span>
              </div>
              <p className={styles.mmCommentBody}>{c.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Re-export for symmetry with other consumers.
export { formatDateLong };
