"use client";

import { useCallback, useEffect, useState } from "react";

import { Button, Modal } from "@/components/admin";
import type { EsignaturesTemplate } from "@/lib/esignatures-types";

import styles from "../contracts.module.css";

import { MemberPicker, type MemberPickResult } from "./MemberPicker";
import { TemplateFieldsRenderer } from "./TemplateFieldsRenderer";

type Props = {
  open: boolean;
  onClose: () => void;
  onSent: (contractId: string) => void;
};

type SignerDraft = {
  name: string;
  email: string;
};

/**
 * Send-from-CRM contract composer (Phase C). Flow:
 *
 *   1. Pick a template (dropdown — live-fetched from esignatures.com).
 *   2. Pick a counterparty (member search).
 *   3. Fill placeholder fields (dynamic renderer per template shape).
 *   4. Tweak the signer list (auto-populated from the chosen member).
 *   5. Submit → POST /api/admin/contracts with the template-mode body.
 *
 * On success: caller's `onSent` receives the new contract id so the
 * parent can navigate to the detail page.
 *
 * Idempotency: the API has no idempotency keys, so we disable the
 * submit button while in-flight to prevent double-send. If the server
 * returns a non-2xx mid-flight, we surface the error without retrying.
 */
export function ContractComposer({ open, onClose, onSent }: Props) {
  const [templates, setTemplates] = useState<EsignaturesTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [templateId, setTemplateId] = useState<string>("");
  const selectedTemplate = templates.find((t) => t.template_id === templateId);

  const [member, setMember] = useState<MemberPickResult | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [signers, setSigners] = useState<SignerDraft[]>([
    { name: "", email: "" },
  ]);
  const [title, setTitle] = useState("");
  const [isTest, setIsTest] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load templates whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setTemplatesLoading(true);
    setTemplatesError(null);
    (async () => {
      try {
        const res = await fetch("/api/admin/contracts/templates", {
          cache: "no-store",
        });
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(`HTTP ${res.status} — ${detail.slice(0, 200)}`);
        }
        const json = (await res.json()) as {
          ok: boolean;
          templates: EsignaturesTemplate[];
        };
        if (!cancelled) setTemplates(json.templates ?? []);
      } catch (err) {
        if (!cancelled) {
          setTemplatesError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // When the user picks a member, auto-fill the first signer.
  useEffect(() => {
    if (!member) return;
    const name =
      [member.first_name, member.last_name].filter(Boolean).join(" ").trim() ||
      member.organization ||
      "";
    setSigners((prev) => {
      const next = [...prev];
      if (next[0]) {
        next[0] = {
          name: next[0].name || name,
          email: next[0].email || (member.email ?? ""),
        };
      }
      return next;
    });
  }, [member]);

  // Reset state when the modal closes so re-opening starts clean.
  useEffect(() => {
    if (open) return;
    setTemplateId("");
    setMember(null);
    setFieldValues({});
    setSigners([{ name: "", email: "" }]);
    setTitle("");
    setIsTest(false);
    setError(null);
  }, [open]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    // Client-side validation mirrors the server's so the user sees the
    // problem before a round-trip.
    if (!templateId) {
      setError("Pick a template.");
      return;
    }
    if (!member) {
      setError("Pick a counterparty.");
      return;
    }
    const cleanedSigners = signers
      .map((s) => ({ name: s.name.trim(), email: s.email.trim() }))
      .filter((s) => s.name && s.email && s.email.includes("@"));
    if (cleanedSigners.length === 0) {
      setError("At least one signer with a valid name + email is required.");
      return;
    }
    const placeholders = Object.entries(fieldValues)
      .map(([api_key, value]) => ({ api_key, value }))
      .filter((p) => p.api_key);

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: templateId,
          member_id: member.id,
          signers: cleanedSigners,
          placeholder_fields: placeholders,
          title: title.trim() || undefined,
          test: isTest,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        warning?: string;
        contract?: { id: string };
      };
      if (!res.ok || !json.ok || !json.contract?.id) {
        const message = json.error ?? `Send failed (HTTP ${res.status}).`;
        const detail = json.detail ? ` ${json.detail}` : "";
        throw new Error(`${message}${detail}`);
      }
      onSent(json.contract.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }, [
    templateId,
    member,
    signers,
    fieldValues,
    title,
    isTest,
    onSent,
    onClose,
  ]);

  return (
    <Modal title="Send new contract" open={open} onClose={onClose}>
      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="composer-template">
          Template
        </label>
        {templatesLoading ? (
          <div className={styles.formHint}>Loading templates…</div>
        ) : templatesError ? (
          <div className={styles.formError}>{templatesError}</div>
        ) : (
          <select
            id="composer-template"
            className={styles.formInput}
            value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value);
              setFieldValues({});
            }}
            disabled={submitting}
          >
            <option value="">— Choose a template —</option>
            {templates.map((t) => (
              <option key={t.template_id} value={t.template_id}>
                {t.title}
              </option>
            ))}
          </select>
        )}
      </div>

      <MemberPicker
        picked={member}
        onPick={setMember}
        disabled={submitting}
      />

      {selectedTemplate && (
        <TemplateFieldsRenderer
          fields={selectedTemplate.placeholder_fields}
          values={fieldValues}
          onChange={(api_key, v) =>
            setFieldValues((prev) => ({ ...prev, [api_key]: v }))
          }
          disabled={submitting}
        />
      )}

      <div className={styles.formField}>
        <div className={styles.formLabel}>Signers</div>
        <div className={styles.signersList}>
          {signers.map((s, idx) => (
            <div key={idx} className={styles.signerRow}>
              <div
                style={{ display: "flex", gap: 8, flex: 1, minWidth: 0 }}
              >
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Name"
                  value={s.name}
                  onChange={(e) =>
                    setSigners((prev) =>
                      prev.map((p, i) =>
                        i === idx ? { ...p, name: e.target.value } : p,
                      ),
                    )
                  }
                  disabled={submitting}
                />
                <input
                  type="email"
                  className={styles.formInput}
                  placeholder="Email"
                  value={s.email}
                  onChange={(e) =>
                    setSigners((prev) =>
                      prev.map((p, i) =>
                        i === idx ? { ...p, email: e.target.value } : p,
                      ),
                    )
                  }
                  disabled={submitting}
                />
              </div>
              {signers.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setSigners((prev) => prev.filter((_, i) => i !== idx))
                  }
                  disabled={submitting}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className={styles.formActions} style={{ justifyContent: "flex-start" }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setSigners((prev) => [...prev, { name: "", email: "" }])
            }
            disabled={submitting}
          >
            + Add signer
          </Button>
        </div>
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="composer-title">
          Title (optional)
        </label>
        <input
          id="composer-title"
          type="text"
          className={styles.formInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Defaults to the template's own title"
          disabled={submitting}
        />
      </div>

      <div className={styles.formField}>
        <label
          style={{ display: "flex", alignItems: "center", gap: 8 }}
          htmlFor="composer-test"
        >
          <input
            id="composer-test"
            type="checkbox"
            checked={isTest}
            onChange={(e) => setIsTest(e.target.checked)}
            disabled={submitting}
          />
          <span>Send as test (no email to the signer)</span>
        </label>
      </div>

      {error && <div className={styles.formError}>{error}</div>}

      <div className={styles.formActions}>
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={submitting || !templateId || !member}
        >
          {submitting ? "Sending…" : "Send contract"}
        </Button>
      </div>
    </Modal>
  );
}
