"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Modal } from "@/components/admin";
import { defaultInviteWelcome } from "@/lib/studio-invite-email";

import styles from "./page.module.css";

type Phase =
  | { kind: "form" }
  | { kind: "sending" }
  | { kind: "sent"; email: string };

type MemberKind = "creator" | "brand";

/**
 * "+ Invite member" on /admin/studio-members. Opens a small form
 * (member type, brand/show name, contact person, email, welcome text,
 * optional note) and POSTs /api/admin/studio/invite — which
 * files/updates the CRM row and sends the studio-branded invite email
 * whose signed link opens the (invite-only) register page with these
 * details prefilled and email + type locked.
 *
 * The welcome text starts as the shared template
 * (defaultInviteWelcome, live-resolved as type/org change) and
 * becomes a personal message the moment it's edited; "Reset to
 * template" reverts. "Preview email" renders the exact send-side
 * HTML via /api/admin/studio/invite/preview in an iframe.
 */
export function InviteMemberButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [memberKind, setMemberKind] = useState<MemberKind>("creator");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // null = still on the template; a string = the team's personal
  // welcome text.
  const [welcomeDraft, setWelcomeDraft] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const welcome = welcomeDraft ?? defaultInviteWelcome();

  function reset() {
    setPhase({ kind: "form" });
    setMemberKind("creator");
    setOrgName("");
    setEmail("");
    setFirstName("");
    setLastName("");
    setWelcomeDraft(null);
    setNote("");
    setPreviewHtml(null);
    setPreviewLoading(false);
    setError(null);
  }

  function close() {
    if (phase.kind === "sending") return;
    setOpen(false);
    if (phase.kind === "sent") {
      router.refresh();
    }
    reset();
  }

  async function sendInvite() {
    setError(null);
    setPhase({ kind: "sending" });
    try {
      const res = await fetch("/api/admin/studio/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          kind: memberKind,
          orgName,
          welcome,
          note: note.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `Invite failed (${res.status}).`);
      }
      setPhase({ kind: "sent", email });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase({ kind: "form" });
      // Surface the error on the form, not behind the preview.
      setPreviewHtml(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await sendInvite();
  }

  async function loadPreview() {
    setError(null);
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/studio/invite/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          kind: memberKind,
          orgName,
          welcome,
          note: note.trim() || undefined,
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

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Invite member
      </Button>

      {open && (
        <Modal
          open
          onClose={close}
          size={previewHtml && phase.kind !== "sent" ? "lg" : "sm"}
          dismissible={phase.kind !== "sending"}
          title={
            phase.kind === "sent"
              ? "Invite sent"
              : previewHtml
                ? "Invite email preview"
                : "Invite a member"
          }
          subtitle={
            phase.kind === "sent"
              ? undefined
              : previewHtml
                ? "Exactly what lands in their inbox — the real email carries their personal sign-up link instead of the placeholder."
                : "They get a studio-branded email with a personal sign-up link (expires in 30 days) — type, name, and brand/show come prefilled from this form. Their CRM record is prepared now, so everything connects when they register."
          }
        >
          {phase.kind === "sent" ? (
            <div className={styles.inviteSent}>
              <p className={styles.inviteSentLead}>
                The invite is on its way to <strong>{phase.email}</strong>.
              </p>
              <p className={styles.inviteSentHint}>
                They&apos;ll appear in this list once they create their account
                and confirm their email.
              </p>
              <div className={styles.inviteActions}>
                <Button variant="primary" onClick={close}>
                  Done
                </Button>
              </div>
            </div>
          ) : previewHtml ? (
            <div className={styles.invitePreview}>
              <iframe
                className={styles.invitePreviewFrame}
                title="Invite email preview"
                sandbox=""
                srcDoc={previewHtml}
              />
              <div className={styles.inviteActions}>
                <Button
                  variant="ghost"
                  onClick={() => setPreviewHtml(null)}
                  disabled={phase.kind === "sending"}
                >
                  Back to form
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void sendInvite()}
                  disabled={phase.kind === "sending"}
                >
                  {phase.kind === "sending" ? "Sending…" : "Send invite"}
                </Button>
              </div>
            </div>
          ) : (
            <form className={styles.inviteForm} onSubmit={submit}>
              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.inviteNameRow}>
                <label className={styles.inviteField}>
                  <span className={styles.factLabel}>Member type</span>
                  <select
                    className={styles.inviteInput}
                    value={memberKind}
                    onChange={(e) =>
                      setMemberKind(e.target.value as MemberKind)
                    }
                  >
                    <option value="creator">Creator (podcast)</option>
                    <option value="brand">Brand</option>
                  </select>
                </label>
                <label className={styles.inviteField}>
                  <span className={styles.factLabel}>
                    {memberKind === "creator" ? "Show name" : "Brand name"}
                  </span>
                  <input
                    type="text"
                    required
                    className={styles.inviteInput}
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={
                      memberKind === "creator" ? "Unseriously" : "Acme Co"
                    }
                  />
                </label>
              </div>

              <label className={styles.inviteField}>
                <span className={styles.factLabel}>Contact email</span>
                <input
                  type="email"
                  required
                  className={styles.inviteInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="person@company.com"
                  autoFocus
                />
              </label>

              <div className={styles.inviteNameRow}>
                <label className={styles.inviteField}>
                  <span className={styles.factLabel}>Contact first name</span>
                  <input
                    type="text"
                    required
                    className={styles.inviteInput}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>
                <label className={styles.inviteField}>
                  <span className={styles.factLabel}>Contact last name</span>
                  <input
                    type="text"
                    className={styles.inviteInput}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>
              </div>

              <label className={styles.inviteField}>
                <span className={styles.factLabel}>Welcome text</span>
                <textarea
                  className={styles.inviteTextarea}
                  value={welcome}
                  onChange={(e) => setWelcomeDraft(e.target.value)}
                  maxLength={2000}
                  rows={5}
                />
                <span className={styles.inviteHint}>
                  {welcomeDraft === null ? (
                    "Template text — edit it to send a personal welcome."
                  ) : (
                    <>
                      Personal welcome — this exact text goes in the email.{" "}
                      <button
                        type="button"
                        className={styles.inviteHintReset}
                        onClick={() => setWelcomeDraft(null)}
                      >
                        Reset to template
                      </button>
                    </>
                  )}
                </span>
              </label>

              <label className={styles.inviteField}>
                <span className={styles.factLabel}>
                  Additional information (optional)
                </span>
                <textarea
                  className={styles.inviteTextarea}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Shown in the email as “A note from the team”, and saved to their CRM notes."
                />
              </label>

              <div className={styles.inviteActions}>
                <Button
                  variant="ghost"
                  onClick={() => void loadPreview()}
                  disabled={phase.kind === "sending" || previewLoading}
                >
                  {previewLoading ? "Rendering…" : "Preview email"}
                </Button>
                <Button variant="ghost" onClick={close} disabled={phase.kind === "sending"}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={phase.kind === "sending"}
                >
                  {phase.kind === "sending" ? "Sending…" : "Send invite"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
