"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createStudioBrowserClient } from "@/lib/studio-auth-client";

import styles from "../studio.module.css";

/** Set-new-password page for the Supabase password-recovery flow.
 *
 * Supabase emails the recovery link as Site URL + a hash fragment
 * (#access_token=...&type=recovery). The browser SDK auto-consumes
 * the hash on mount and fires a PASSWORD_RECOVERY auth event; once
 * we see it, we render the form. updateUser sets the new password
 * against the recovery session, then we sign out and bounce to
 * /studio/login for a clean re-auth with the new password. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createStudioBrowserClient();
    // Two paths to "ready": the SDK fires PASSWORD_RECOVERY once it
    // sees the hash, OR a session is already established (e.g., the
    // user reloaded the page after the hash was consumed).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createStudioBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      // Sign out the recovery session so the user re-enters with
      // the new password through the normal login flow — clearer
      // mental model than auto-routing into the dashboard.
      await supabase.auth.signOut();
      router.replace("/studio/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.brand}>
          <span className={styles.brandName}>GhostSignal</span>
          <span className={styles.brandTag}>Studio</span>
        </div>
        <h1 className={styles.title}>Set a new password</h1>
        <p className={styles.subtitle}>
          {ready
            ? "Choose a new password. You'll sign in with it on the next screen."
            : "Loading recovery session…"}
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">New password</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              className={styles.input}
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            className={styles.submit}
            disabled={submitting || !ready}
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
