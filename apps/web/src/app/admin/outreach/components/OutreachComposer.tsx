"use client";

import { useCallback, useState } from "react";

import { Button, Modal } from "@/components/admin";
import { defaultOutreachMessage } from "@/lib/cold-outreach-email";
import { formatInZone, localTimeZone } from "@/lib/timezone";

import { ScheduleFields, type ScheduleResolution } from "./ScheduleFields";
import styles from "../outreach.module.css";

type Phase =
  | { kind: "form" }
  | { kind: "sending" }
  | { kind: "sent"; email: string; scheduledAt: Date | null; tz: string | null };

type Timing = "now" | "schedule";

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
  scheduledPeers = [],
}: {
  onClose: () => void;
  onSent: () => void;
  /** Epoch-ms of already-scheduled sends, for collision-aware stagger. */
  scheduledPeers?: number[];
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timing, setTiming] = useState<Timing>("now");
  const [schedule, setSchedule] = useState<ScheduleResolution>(null);
  const onResolve = useCallback((r: ScheduleResolution) => setSchedule(r), []);
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
    // Guard: scheduling chosen but the picker hasn't resolved a valid
    // future instant yet.
    if (timing === "schedule" && !schedule) {
      setError("Pick a valid delivery time before scheduling.");
      return;
    }
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
          scheduledAt:
            timing === "schedule" && schedule
              ? schedule.utc.toISOString()
              : undefined,
          recipientTz:
            timing === "schedule" && schedule ? schedule.tz : undefined,
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
      setPhase({
        kind: "sent",
        email,
        scheduledAt:
          timing === "schedule" && schedule ? schedule.utc : null,
        tz: timing === "schedule" && schedule ? schedule.tz : null,
      });
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

  // Sizing per state: the compose form goes wide (two-column, no
  // scrolling); the email preview keeps the centred-iframe width; the
  // sent confirmation stays compact.
  const isSent = phase.kind === "sent";
  const isPreview = Boolean(previewHtml) && !isSent;
  const isForm = !isSent && !isPreview;

  return (
    <Modal
      open
      onClose={close}
      size={isForm ? "xl" : isPreview ? "xl" : "sm"}
      className={isForm ? styles.composerWide : undefined}
      dismissible={phase.kind !== "sending"}
      title={
        phase.kind === "sent"
          ? phase.scheduledAt
            ? "Reachout scheduled"
            : "Reachout sent"
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
          {phase.scheduledAt ? (
            <>
              <p className={styles.sentLead}>
                Queued to arrive for <strong>{phase.email}</strong> at{" "}
                <strong>
                  {formatInZone(phase.scheduledAt, phase.tz ?? localTimeZone())}
                </strong>
                .
              </p>
              <p className={styles.sentHint}>
                That&apos;s{" "}
                {formatInZone(phase.scheduledAt, localTimeZone())} your time.
                It&apos;s in the list below as &ldquo;scheduled&rdquo; — you can
                reschedule or cancel it right up until it sends.
              </p>
            </>
          ) : (
            <>
              <p className={styles.sentLead}>
                The cold email is on its way to <strong>{phase.email}</strong>.
              </p>
              <p className={styles.sentHint}>
                It&apos;s filed in the list below — status updates to
                &ldquo;failed&rdquo; if the send bounces at the provider.
              </p>
            </>
          )}
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
              {phase.kind === "sending"
                ? timing === "schedule"
                  ? "Scheduling…"
                  : "Sending…"
                : timing === "schedule"
                  ? "Schedule reachout"
                  : "Send reachout"}
            </Button>
          </div>
        </div>
      ) : (
        <form className={`${styles.form} ${styles.formGrid}`} onSubmit={submit}>
          {error && (
            <div className={`${styles.formError} ${styles.spanAll}`}>{error}</div>
          )}

          {duplicateAt && (
            <div className={`${styles.duplicateWarn} ${styles.spanAll}`}>
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

          <fieldset className={`${styles.themeField} ${styles.spanAll}`}>
            <legend className={styles.fieldLabel}>Timing</legend>
            <div className={styles.timingToggle}>
              <button
                type="button"
                className={`${styles.timingOption} ${timing === "now" ? styles.timingActive : ""}`}
                onClick={() => setTiming("now")}
                aria-pressed={timing === "now"}
              >
                Send now
              </button>
              <button
                type="button"
                className={`${styles.timingOption} ${timing === "schedule" ? styles.timingActive : ""}`}
                onClick={() => setTiming("schedule")}
                aria-pressed={timing === "schedule"}
              >
                Schedule for later
              </button>
            </div>
          </fieldset>

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

          <fieldset className={`${styles.themeField} ${styles.spanAll}`}>
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

          <label className={`${styles.field} ${styles.spanAll}`}>
            <span className={styles.fieldLabel}>Personal message</span>
            <textarea
              className={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Why this brand fits the network — written like a person, not a campaign. Left blank, the standard template text is sent."
            />
          </label>

          {timing === "schedule" && (
            <div className={styles.spanAll}>
              <ScheduleFields peers={scheduledPeers} onResolve={onResolve} />
            </div>
          )}

          <div className={`${styles.formActions} ${styles.spanAll}`}>
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
              {phase.kind === "sending"
                ? timing === "schedule"
                  ? "Scheduling…"
                  : "Sending…"
                : timing === "schedule"
                  ? "Schedule reachout"
                  : "Send reachout"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
