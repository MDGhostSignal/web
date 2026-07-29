"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Modal } from "@/components/admin";

import styles from "./page.module.css";

type Phase =
  | { kind: "form" }
  | { kind: "sending" }
  | { kind: "sent"; email: string };

/**
 * "+ Invite member" on /admin/studio-members. Opens a small form
 * (email, first/last name, optional note) and POSTs
 * /api/admin/studio/invite — which files/updates the CRM row and
 * sends the studio-branded invite email pointing at /studio/register.
 */
export function InviteMemberButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPhase({ kind: "form" });
    setEmail("");
    setFirstName("");
    setLastName("");
    setNote("");
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
          size="sm"
          dismissible={phase.kind !== "sending"}
          title={phase.kind === "sent" ? "Invite sent" : "Invite a member"}
          subtitle={
            phase.kind === "sent"
              ? undefined
              : "They get a studio-branded email with a sign-up link. Their CRM record is prepared now, so everything connects when they register."
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
          ) : (
            <form className={styles.inviteForm} onSubmit={submit}>
              {error && <div className={styles.error}>{error}</div>}

              <label className={styles.inviteField}>
                <span className={styles.factLabel}>Email</span>
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
                  <span className={styles.factLabel}>First name</span>
                  <input
                    type="text"
                    required
                    className={styles.inviteInput}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>
                <label className={styles.inviteField}>
                  <span className={styles.factLabel}>Last name</span>
                  <input
                    type="text"
                    className={styles.inviteInput}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>
              </div>

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
