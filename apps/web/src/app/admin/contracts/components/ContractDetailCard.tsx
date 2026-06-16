"use client";

import { useCallback, useState } from "react";

import { Badge, type BadgeVariant, Button } from "@/components/admin";
import {
  type ContractCounterpartyKind,
  type ContractSignerRow,
  type ContractStatus,
  type ContractWithSigners,
  CONTRACT_STATUS_LABELS,
  COUNTERPARTY_KIND_LABELS,
  COUNTERPARTY_KINDS,
} from "@/lib/esignatures-types";

import styles from "../contracts.module.css";

type Props = {
  contract: ContractWithSigners;
  onResync: () => void;
  onArchive: () => void;
  onUpdate: (patch: Record<string, unknown>) => Promise<void>;
  onRemindSigner: (signerId: string) => Promise<void>;
  busy: boolean;
};

/**
 * Top-of-page detail card: status pill, dates, counterparty kind editor,
 * notes textarea, signer list with per-signer "Send reminder" buttons,
 * and the resync/archive header actions.
 */
export function ContractDetailCard({
  contract,
  onResync,
  onArchive,
  onUpdate,
  onRemindSigner,
  busy,
}: Props) {
  const [notes, setNotes] = useState(contract.notes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);

  const handleSaveNotes = useCallback(() => {
    onUpdate({ notes: notes.trim() || null }).then(() => setNotesDirty(false));
  }, [notes, onUpdate]);

  const handleCancelNotes = useCallback(() => {
    setNotes(contract.notes ?? "");
    setNotesDirty(false);
  }, [contract.notes]);

  const handleUnarchive = useCallback(() => {
    onUpdate({ archived_at: null });
  }, [onUpdate]);

  return (
    <div className={styles.detailCard}>
      <div className={styles.detailHeaderRow}>
        <div>
          <div className={styles.detailCardTitle}>
            {contract.title || "(untitled contract)"}
          </div>
          <div className={styles.signerEmail} style={{ marginTop: 4 }}>
            {contract.id}
          </div>
        </div>
        <div className={styles.detailHeaderActions}>
          <Badge variant={statusVariant(contract.status)}>
            {CONTRACT_STATUS_LABELS[contract.status]}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onResync}
            disabled={busy}
          >
            Resync now
          </Button>
          {contract.archived_at ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnarchive}
              disabled={busy}
            >
              Unarchive
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={onArchive}
              disabled={busy}
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      <div className={styles.detailMeta}>
        <div className={styles.detailMetaKey}>Sent</div>
        <div className={styles.detailMetaValue}>{formatDate(contract.sent_at)}</div>
        <div className={styles.detailMetaKey}>Signed</div>
        <div className={styles.detailMetaValue}>
          {formatDate(contract.signed_at)}
        </div>
        <div className={styles.detailMetaKey}>Expires</div>
        <div className={styles.detailMetaValue}>
          {formatDate(contract.expires_at)}
        </div>
        <div className={styles.detailMetaKey}>Template</div>
        <div className={styles.detailMetaValue}>
          {contract.template_id ?? "—"}
        </div>
        <div className={styles.detailMetaKey}>Counterparty</div>
        <div className={styles.detailMetaValue}>
          <select
            className={styles.formInput}
            style={selectStyle}
            value={contract.counterparty_kind ?? ""}
            onChange={(e) => onUpdate({ counterparty_kind: parseKind(e.target.value) })}
            disabled={busy}
          >
            <option value="">— Not set —</option>
            {COUNTERPARTY_KINDS.map((k) => (
              <option key={k} value={k}>
                {COUNTERPARTY_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor={`notes-${contract.id}`}>
          Internal notes
        </label>
        <textarea
          id={`notes-${contract.id}`}
          className={styles.notesArea}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(e.target.value !== (contract.notes ?? ""));
          }}
          placeholder="Anything the team should remember about this agreement…"
          disabled={busy}
        />
        {notesDirty && (
          <div className={styles.formActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelNotes}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveNotes}
              disabled={busy}
            >
              Save notes
            </Button>
          </div>
        )}
      </div>

      {contract.signers.length > 0 && (
        <div className={styles.formField}>
          <div className={styles.formLabel}>Signers</div>
          <SignersList
            signers={contract.signers}
            contractStatus={contract.status}
            onRemind={onRemindSigner}
            busy={busy}
          />
        </div>
      )}
    </div>
  );
}

/* --- Signers list -------------------------------------------------- */

function SignersList({
  signers,
  contractStatus,
  onRemind,
  busy,
}: {
  signers: ContractSignerRow[];
  contractStatus: ContractStatus;
  onRemind: (signerId: string) => Promise<void>;
  busy: boolean;
}) {
  // Reminders only make sense while the contract is still in-flight.
  const canRemind =
    contractStatus === "sent" || contractStatus === "viewed";

  return (
    <div className={styles.signersList}>
      {signers.map((s) => (
        <div key={s.id} className={styles.signerRow}>
          <div className={styles.signerInfo}>
            <span className={styles.signerName}>
              {s.name ?? s.email ?? "(unknown signer)"}
            </span>
            {s.email && <span className={styles.signerEmail}>{s.email}</span>}
          </div>
          <div className={styles.signerActions}>
            <Badge variant={signerStatusVariant(s.status)}>{s.status}</Badge>
            {canRemind && s.status !== "signed" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemind(s.id)}
                disabled={busy}
              >
                Send reminder
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* --- Helpers ------------------------------------------------------- */

const selectStyle = { maxWidth: 200, fontFamily: "inherit" } as const;

function parseKind(raw: string): ContractCounterpartyKind | null {
  if (raw === "") return null;
  if ((COUNTERPARTY_KINDS as readonly string[]).includes(raw)) {
    return raw as ContractCounterpartyKind;
  }
  return null;
}

function statusVariant(s: ContractStatus): BadgeVariant {
  switch (s) {
    case "signed":
    case "completed":
      return "success";
    case "sent":
    case "viewed":
      return "warn";
    case "declined":
    case "expired":
      return "danger";
    default:
      return "neutral";
  }
}

function signerStatusVariant(s: string): BadgeVariant {
  const lower = s.toLowerCase();
  if (lower === "signed") return "success";
  if (lower === "viewed" || lower === "sent") return "warn";
  if (lower === "declined") return "danger";
  return "neutral";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
