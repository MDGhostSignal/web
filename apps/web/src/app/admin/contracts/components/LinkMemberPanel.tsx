"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Badge, Button, SearchInput } from "@/components/admin";

import styles from "../contracts.module.css";

type MemberLite = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  email: string | null;
  member_type: string;
};

type Props = {
  contractId: string;
  memberId: string | null;
  suggestedMemberId: string | null;
  linkedMember: MemberLite | null;
  suggestedMember: MemberLite | null;
  onUpdated: () => void;
};

/**
 * Counterparty linking panel for the contract detail page.
 *
 * Three states:
 *  - Confirmed link  →  show the linked member + "Unlink" button.
 *  - Suggestion      →  show "We think this might be X" + Confirm / Reject.
 *  - No link         →  search-pick widget over members.
 *
 * Every action PATCHes /api/admin/contracts/[id] and bubbles a refresh
 * up so the parent can re-render with new state.
 */
export function LinkMemberPanel({
  contractId,
  memberId,
  suggestedMemberId,
  linkedMember,
  suggestedMember,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/contracts/${encodeURIComponent(contractId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          detail?: string;
        };
        if (!res.ok || !json.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        onUpdated();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [contractId, onUpdated],
  );

  if (memberId && linkedMember) {
    return (
      <div className={styles.linkPanel}>
        <div className={styles.linkConfirmed}>
          <div className={styles.linkSuggestionLabel}>Linked to</div>
          <div className={styles.linkSuggestionName}>
            {formatName(linkedMember)}
          </div>
          <div>
            <Badge variant={kindBadge(linkedMember.member_type)}>
              {linkedMember.member_type}
            </Badge>
          </div>
          <div className={styles.linkButtons}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => patch({ member_id: null })}
              disabled={busy}
            >
              Unlink
            </Button>
          </div>
        </div>
        {error && <div className={styles.formError}>{error}</div>}
      </div>
    );
  }

  if (suggestedMemberId && suggestedMember) {
    return (
      <div className={styles.linkPanel}>
        <div className={styles.linkSuggestion}>
          <div className={styles.linkSuggestionLabel}>Suggested match</div>
          <div className={styles.linkSuggestionName}>
            {formatName(suggestedMember)}
          </div>
          <div>
            <Badge variant={kindBadge(suggestedMember.member_type)}>
              {suggestedMember.member_type}
            </Badge>
          </div>
          <div className={styles.linkButtons}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => patch({ member_id: suggestedMemberId })}
              disabled={busy}
            >
              Confirm match
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => patch({ suggested_member_id: null })}
              disabled={busy}
            >
              Reject
            </Button>
          </div>
        </div>
        <MemberSearchPicker
          onPick={(id) => patch({ member_id: id })}
          disabled={busy}
          label="Or pick a different member"
        />
        {error && <div className={styles.formError}>{error}</div>}
      </div>
    );
  }

  return (
    <div className={styles.linkPanel}>
      <MemberSearchPicker
        onPick={(id) => patch({ member_id: id })}
        disabled={busy}
        label="Link this contract to a CRM member"
      />
      {error && <div className={styles.formError}>{error}</div>}
    </div>
  );
}

/* --- Internal: search-pick widget ----------------------------------- */

type SearchProps = {
  onPick: (memberId: string) => void;
  disabled?: boolean;
  label: string;
};

function MemberSearchPicker({ onPick, disabled, label }: SearchProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MemberLite[]>([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/admin/members/lite?q=${encodeURIComponent(q.trim())}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const json = (await res.json()) as { members?: MemberLite[] };
          setResults(json.members ?? []);
        }
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q]);

  return (
    <div className={styles.formField}>
      <label className={styles.formLabel}>{label}</label>
      <SearchInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email, or organization…"
        disabled={disabled}
      />
      {searching && <div className={styles.formHint}>Searching…</div>}
      {results.length > 0 && (
        <div className={styles.signersList}>
          {results.map((m) => (
            <div key={m.id} className={styles.signerRow}>
              <div className={styles.signerInfo}>
                <span className={styles.signerName}>{formatName(m)}</span>
                {m.email && (
                  <span className={styles.signerEmail}>{m.email}</span>
                )}
              </div>
              <div className={styles.signerActions}>
                <Badge variant={kindBadge(m.member_type)}>{m.member_type}</Badge>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onPick(m.id)}
                  disabled={disabled}
                >
                  Link
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatName(m: MemberLite): string {
  return (
    [m.first_name, m.last_name].filter(Boolean).join(" ").trim() ||
    m.organization ||
    "(unnamed member)"
  );
}

function kindBadge(kind: string) {
  if (kind === "creator") return "creator" as const;
  if (kind === "brand") return "brand" as const;
  return "neutral" as const;
}
