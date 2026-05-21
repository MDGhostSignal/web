"use client";

import { useEffect, useRef, useState } from "react";

import { Badge, Button, SearchInput } from "@/components/admin";

import styles from "../contracts.module.css";

export type MemberPickResult = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  email: string | null;
  member_type: string;
};

type Props = {
  picked: MemberPickResult | null;
  onPick: (m: MemberPickResult | null) => void;
  disabled?: boolean;
};

/**
 * Search-and-pick member widget for the contract composer. Identical
 * behaviour to the search in LinkMemberPanel but exposes the chosen
 * member to the parent (instead of immediately PATCHing) so the
 * composer can use the email/name to pre-fill the signer fields.
 */
export function MemberPicker({ picked, onPick, disabled }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MemberPickResult[]>([]);
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
          const json = (await res.json()) as { members?: MemberPickResult[] };
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

  if (picked) {
    return (
      <div className={styles.formField}>
        <div className={styles.formLabel}>Counterparty</div>
        <div className={styles.linkConfirmed}>
          <div className={styles.linkSuggestionName}>{formatName(picked)}</div>
          <div>
            <Badge variant={kindBadge(picked.member_type)}>
              {picked.member_type}
            </Badge>
          </div>
          {picked.email && (
            <div className={styles.signerEmail}>{picked.email}</div>
          )}
          <div className={styles.linkButtons}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPick(null)}
              disabled={disabled}
            >
              Change
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formField}>
      <label className={styles.formLabel}>Counterparty</label>
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
                  onClick={() => onPick(m)}
                  disabled={disabled}
                >
                  Pick
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatName(m: MemberPickResult): string {
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
