"use client";

import { useState } from "react";

import { Button, Modal } from "@/components/admin";
import { defaultOutreachMessage } from "@/lib/cold-outreach-email";

import styles from "../outreach.module.css";

type Phase =
  | { kind: "form" }
  | { kind: "sending" }
  | { kind: "sent"; email: string };

/**
 * Cold-email composer modal — name, email, personal message. "Preview
 * email" renders the exact send-side HTML via
 * /api/admin/outreach/preview in a sandboxed iframe (same pattern as
 * the studio invite modal). Sending files the row and fires Resend;
 * a 409 means the address was already contacted and offers a
 * send-anyway confirm so nobody double-cold-emails by accident.
 */
export function OutreachComposer({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // Prefilled with the standard template text (same pattern as the
  // studio invite form) — edit it per-send to make it personal.
  const [message, setMessage] = useState(defaultOutreachMessage());
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  // Which template goes out — picked in the form, mirrored by the
  // preview toggle, and sent with the reachout.
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [duplicateAt, setDuplicateAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (phase.kind === "sending") return;
    if (phase.kind === "sent") onSent();
    onClose();
  }

  async function send(force: boolean) {
    setError(null);
    setPhase({ kind: "sending" });
    try {
      const res = await fetch("/api/admin/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          theme,
          force: force || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setDuplicateAt(body.alreadyContactedAt ?? "an earlier date");
        setPhase({ kind: "form" });
        setPreviewHtml(null);
        return;
      }
      if (!res.ok) {
        throw new Error(body.error ?? `Send failed (${res.status}).`);
      }
      setPhase({ kind: "sent", email });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase({ kind: "form" });
      setPreviewHtml(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await send(false);
  }

  async function loadPreview(nextTheme: "light" | "dark" = theme) {
    setError(null);
    setPreviewLoading(true);
    setTheme(nextTheme);
    try {
      const res = await fetch("/api/admin/outreach/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, theme: nextTheme }),
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

  const duplicateDate = duplicateAt
    ? new Date(duplicateAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Modal
      open
      onClose={close}
      size={previewHtml && phase.kind !== "sent" ? "lg" : "sm"}
      dismissible={phase.kind !== "sending"}
      title={
        phase.kind === "sent"
          ? "Reachout sent"
          : previewHtml
            ? "Email preview"
            : "New cold reachout"
      }
      subtitle={
        phase.kind === "sent"
          ? undefined
          : previewHtml
            ? "Exactly what lands in their inbox."
            : "Your personal message is the heart of the email — the branded shell and pitch copy wrap around it automatically."
      }
    >
      {phase.kind === "sent" ? (
        <div className={styles.sentBox}>
          <p className={styles.sentLead}>
            The cold email is on its way to <strong>{phase.email}</strong>.
          </p>
          <p className={styles.sentHint}>
            It&apos;s filed in the list below — status updates to
            &ldquo;failed&rdquo; if the send bounces at the provider.
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
            title="Cold email preview"
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
              onClick={() => void send(false)}
              disabled={phase.kind === "sending"}
            >
              {phase.kind === "sending" ? "Sending…" : "Send reachout"}
            </Button>
          </div>
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit}>
          {error && <div className={styles.formError}>{error}</div>}

          {duplicateAt && (
            <div className={styles.duplicateWarn}>
              <span>
                This address was already contacted
                {duplicateDate ? ` on ${duplicateDate}` : ""}. Send again
                anyway?
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void send(true)}
                disabled={phase.kind === "sending"}
              >
                Send anyway
              </Button>
            </div>
          )}

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Name</span>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact person's first name — blank sends a plain “Hello,”"
              autoFocus
            />
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <input
              type="email"
              required
              className={styles.input}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setDuplicateAt(null);
              }}
              placeholder="person@brand.com"
            />
          </label>

          <fieldset className={styles.themeField}>
            <legend className={styles.fieldLabel}>Email template</legend>
            <div className={styles.themeChoices}>
              <label className={styles.themeChoice}>
                <input
                  type="radio"
                  name="outreach-theme"
                  value="light"
                  checked={theme === "light"}
                  onChange={() => setTheme("light")}
                />
                <span>Light mode</span>
              </label>
              <label className={styles.themeChoice}>
                <input
                  type="radio"
                  name="outreach-theme"
                  value="dark"
                  checked={theme === "dark"}
                  onChange={() => setTheme("dark")}
                />
                <span>Dark mode</span>
              </label>
            </div>
          </fieldset>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Personal message</span>
            <textarea
              className={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder="Why this brand fits the network — written like a person, not a campaign. Left blank, the standard template text is sent."
            />
          </label>

          <div className={styles.formActions}>
            <Button
              variant="ghost"
              onClick={() => void loadPreview()}
              disabled={phase.kind === "sending" || previewLoading}
            >
              {previewLoading ? "Rendering…" : "Preview email"}
            </Button>
            <Button
              variant="ghost"
              onClick={close}
              disabled={phase.kind === "sending"}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={phase.kind === "sending"}
            >
              {phase.kind === "sending" ? "Sending…" : "Send reachout"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
