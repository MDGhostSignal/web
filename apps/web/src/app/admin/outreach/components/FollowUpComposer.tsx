"use client";

import { useState } from "react";

import { Button, Modal } from "@/components/admin";
import { defaultFollowUpMessage } from "@/lib/cold-outreach-email";

import styles from "../outreach.module.css";

type Phase =
  | { kind: "form" }
  | { kind: "sending" }
  | { kind: "sent"; email: string };

/**
 * Slim follow-up composer — prefilled name/email from an existing
 * reachout row. Mike writes a short note; the email uses only the
 * branded header lockup + footer (no full pitch body).
 */
export function FollowUpComposer({
  row,
  onClose,
  onSent,
}: {
  row: { id: string; name: string; email: string };
  onClose: () => void;
  onSent: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [message, setMessage] = useState(defaultFollowUpMessage());
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (phase.kind === "sending") return;
    if (phase.kind === "sent") onSent();
    onClose();
  }

  async function send() {
    if (!message.trim()) {
      setError("Write a short follow-up note before sending.");
      return;
    }
    setError(null);
    setPhase({ kind: "sending" });
    try {
      const res = await fetch("/api/admin/outreach/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.name,
          email: row.email,
          message,
          theme,
          parentId: row.id,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `Send failed (${res.status}).`);
      }
      setPhase({ kind: "sent", email: row.email });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase({ kind: "form" });
      setPreviewHtml(null);
    }
  }

  async function loadPreview(nextTheme: "light" | "dark" = theme) {
    setError(null);
    setPreviewLoading(true);
    setTheme(nextTheme);
    try {
      const res = await fetch("/api/admin/outreach/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.name,
          message,
          theme: nextTheme,
          variant: "followup",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || typeof body.html !== "string") {
        throw new Error(body.error ?? `Preview failed (${res.status}).`);
      }
      setPreviewHtml(body.html);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPreviewLoading(false);
    }
  }

  const isSent = phase.kind === "sent";
  const isPreview = Boolean(previewHtml) && !isSent;
  const isForm = !isSent && !isPreview;

  return (
    <Modal
      open
      onClose={close}
      size={isForm ? "md" : isPreview ? "xl" : "sm"}
      dismissible={phase.kind !== "sending"}
      title={
        phase.kind === "sent"
          ? "Follow-up sent"
          : previewHtml
            ? "Follow-up preview"
            : "Send follow-up"
      }
      subtitle={
        phase.kind === "sent"
          ? undefined
          : previewHtml
            ? "Header + your note + footer — no full pitch body."
            : `Nudge ${row.email}. Same branded shell, short personal note only.`
      }
    >
      {phase.kind === "sent" ? (
        <div className={styles.sentBox}>
          <p className={styles.sentLead}>
            Follow-up is on its way to <strong>{phase.email}</strong>.
          </p>
          <p className={styles.sentHint}>
            It&apos;s filed in the list below as another sent reachout.
          </p>
          <div className={styles.formActions}>
            <Button variant="primary" onClick={close}>
              Done
            </Button>
          </div>
        </div>
      ) : previewHtml ? (
        <div className={styles.preview}>
          <div className={styles.previewThemeRow}>
            <Button
              variant={theme === "light" ? "primary" : "ghost"}
              size="sm"
              onClick={() => void loadPreview("light")}
              disabled={previewLoading || phase.kind === "sending"}
            >
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "primary" : "ghost"}
              size="sm"
              onClick={() => void loadPreview("dark")}
              disabled={previewLoading || phase.kind === "sending"}
            >
              Dark
            </Button>
          </div>
          <iframe
            className={styles.previewFrame}
            title="Follow-up email preview"
            sandbox=""
            srcDoc={previewHtml}
          />
          <div className={styles.formActions}>
            <Button
              variant="ghost"
              onClick={() => setPreviewHtml(null)}
              disabled={phase.kind === "sending"}
            >
              Back to form
            </Button>
            <Button
              variant="primary"
              onClick={() => void send()}
              disabled={phase.kind === "sending"}
            >
              {phase.kind === "sending" ? "Sending…" : "Send follow-up"}
            </Button>
          </div>
        </div>
      ) : (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {error && <div className={styles.formError}>{error}</div>}

          <div className={styles.field}>
            <span className={styles.fieldLabel}>To</span>
            <p className={styles.followUpMeta}>
              <strong>{row.name || "—"}</strong>
              <span className={styles.followUpEmail}>{row.email}</span>
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="followup-message">
              Follow-up note
            </label>
            <textarea
              id="followup-message"
              className={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
              disabled={phase.kind === "sending"}
            />
          </div>

          <div className={styles.formActions}>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={phase.kind === "sending"}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void loadPreview()}
              disabled={previewLoading || phase.kind === "sending"}
            >
              {previewLoading ? "Loading…" : "Preview"}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={phase.kind === "sending"}
            >
              {phase.kind === "sending" ? "Sending…" : "Send follow-up"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
