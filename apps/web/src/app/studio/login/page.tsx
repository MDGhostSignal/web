"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { createStudioBrowserClient } from "@/lib/studio-auth-client";

import styles from "../studio.module.css";

/** Studio sign-in. Email + password via Supabase Auth.
 *  Wrapped in Suspense because the form reads `?registered=1` via
 *  useSearchParams — Next.js refuses to statically prerender a page
 *  that calls that hook without a Suspense boundary. */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

/** Structured error so we can lay it out as two sections (cause +
 *  next step) instead of one wall of text. */
type LoginError =
  | {
      kind: "structured";
      title: string;
      reasons: string[];
      footer?: string;
    }
  | { kind: "plain"; message: string };

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const justRegistered = search.get("registered") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LoginError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createStudioBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        // Rewrite Supabase's generic auth errors into structured
        // sections so the user can scan cause + next step quickly.
        const raw = (authError.message ?? "").toLowerCase();
        if (raw.includes("not confirmed") || raw.includes("email link")) {
          setError({
            kind: "structured",
            title: "Confirm your email first",
            reasons: [
              "We sent a confirmation link to your inbox. Click it, then come back here to sign in.",
            ],
            footer:
              "Can't find the email? Check spam or junk. Re-registering won't fix it — the original link is the one that works.",
          });
          setSubmitting(false);
          return;
        }
        if (raw.includes("invalid login")) {
          setError({
            kind: "structured",
            title: "We couldn't sign you in",
            reasons: [
              "Your password is incorrect.",
              "You haven't clicked the email confirmation link yet.",
            ],
            footer:
              "After confirming, your account still needs GhostSignal team approval before you can access the dashboard. We'll email you the moment that lands.",
          });
          setSubmitting(false);
          return;
        }
        setError({ kind: "plain", message: authError.message || "Sign-in failed. Try again." });
        setSubmitting(false);
        return;
      }
      // The server-side proxy decides where they go (dashboard if
      // approved, /studio/pending if not). Just redirect to /studio
      // and let the gate route them.
      router.replace("/studio");
      router.refresh();
    } catch (err) {
      setError({
        kind: "plain",
        message: err instanceof Error ? err.message : String(err),
      });
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
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>
          {justRegistered
            ? "Registration received. Check your email for a confirmation link, then sign in below."
            : "Welcome back. Sign in to see your performance and the marketplace."}
        </p>

        {error && error.kind === "plain" && (
          <div className={styles.error}>{error.message}</div>
        )}
        {error && error.kind === "structured" && (
          <div className={styles.errorPanel} role="alert">
            <div className={styles.errorPanelTitle}>{error.title}</div>
            {error.reasons.length === 1 ? (
              <p className={styles.errorPanelLead}>{error.reasons[0]}</p>
            ) : (
              <ul className={styles.errorPanelList}>
                {error.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            {error.footer && (
              <p className={styles.errorPanelFooter}>{error.footer}</p>
            )}
          </div>
        )}

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className={styles.altLink}>
          Don&apos;t have an account yet? <Link href="/studio/register">Request access</Link>
        </div>
      </div>
    </main>
  );
}
