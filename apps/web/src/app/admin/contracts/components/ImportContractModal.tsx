"use client";

import { useState } from "react";

import { Button, Modal } from "@/components/admin";

import styles from "../contracts.module.css";

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: (contractId: string) => void;
};

/**
 * "Import contract by ID" modal — the only way to backfill an existing
 * esignatures contract into our cache (the esignatures API has no list
 * endpoint, verified during Phase A discovery).
 *
 * Paste the contract id from the esignatures dashboard URL, submit,
 * server fetches + upserts, parent reloads the list.
 */
export function ImportContractModal({ open, onClose, onImported }: Props) {
  const [contractId, setContractId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const id = contractId.trim();
    if (id.length < 4) {
      setError("Paste the contract id from esignatures.com.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_id: id }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        contract?: { id: string };
      };
      if (!res.ok || !json.ok) {
        const message =
          json.error ?? `Import failed (HTTP ${res.status}).`;
        const detail = json.detail ? ` ${json.detail}` : "";
        throw new Error(`${message}${detail}`);
      }
      const importedId = json.contract?.id ?? id;
      setContractId("");
      onImported(importedId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Import contract by ID" open={open} onClose={onClose}>
      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="contract-id-input">
          esignatures.com contract id
        </label>
        <input
          id="contract-id-input"
          className={styles.formInput}
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
          placeholder="e.g. 8f2c…"
          disabled={submitting}
          autoFocus
        />
        <div className={styles.formHint}>
          Paste from the esignatures dashboard URL — the id segment after
          /contracts/. This pulls the contract + signers and links any
          matching CRM member by email.
        </div>
        {error && <div className={styles.formError}>{error}</div>}
      </div>
      <div className={styles.formActions}>
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={submitting || contractId.trim().length < 4}
        >
          {submitting ? "Importing…" : "Import"}
        </Button>
      </div>
    </Modal>
  );
}
