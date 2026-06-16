"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { createStudioBrowserClient } from "@/lib/studio-auth-client";

import styles from "../studio.module.css";

/** Studio sign-in. Email + password via Supabase Auth. */
export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const justRegistered = search.get("registered") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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
      if (authError) throw new Error(authError.message);
      // The server-side proxy decides where they go (dashboard if
      // approved, /studio/pending if not). Just redirect to /studio
      // and let the gate route them.
      router.replace("/studio");
      router.refresh();
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
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>
          {justRegistered
            ? "Registration received. Check your email for a confirmation link, then sign in below."
            : "Welcome back. Sign in to see your performance and the marketplace."}
        </p>

        {error && <div className={styles.error}>{error}</div>}

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
