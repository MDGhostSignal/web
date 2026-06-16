"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createStudioBrowserClient } from "@/lib/studio-auth-client";

import styles from "../studio.module.css";

type Kind = "creator" | "brand";

/**
 * Studio registration — open self-serve sign-up. Creates a Supabase
 * auth user, then hits /api/studio/register which creates (or matches
 * by email) a `members` row with the auth_user_id link and
 * activated_at = NULL. The user lands at /studio/pending until a
 * GhostSignal co-founder approves them from /admin/studio-approvals.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kind, setKind] = useState<Kind>("creator");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createStudioBrowserClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) throw new Error(authError.message);
      if (!data.user) throw new Error("Registration failed: no user returned.");

      // Hand off to our server route so the member row is created /
      // linked under the service role (RLS-bypassing). The browser
      // user just made an authed session via signUp.
      const res = await fetch("/api/studio/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authUserId: data.user.id,
          email,
          firstName,
          lastName,
          kind,
          orgName,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Registration sync failed (${res.status}).`);
      }

      router.replace("/studio/pending");
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
        <h1 className={styles.title}>Request access</h1>
        <p className={styles.subtitle}>
          Register your brand or podcast. A GhostSignal co-founder will
          approve your account, usually within a business day.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <span className={styles.label}>I represent a…</span>
            <div className={styles.kindRow}>
              <button
                type="button"
                className={`${styles.kindBtn} ${kind === "creator" ? styles.kindBtnActive : ""}`}
                onClick={() => setKind("creator")}
              >
                <span className={styles.kindBtnLabel}>Podcast / Creator</span>
                <span className={styles.kindBtnDesc}>
                  I host or own a podcast looking for brand partnerships.
                </span>
              </button>
              <button
                type="button"
                className={`${styles.kindBtn} ${kind === "brand" ? styles.kindBtnActive : ""}`}
                onClick={() => setKind("brand")}
              >
                <span className={styles.kindBtnLabel}>Brand</span>
                <span className={styles.kindBtnDesc}>
                  I&apos;m advertising a brand and looking for aligned podcasts.
                </span>
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="orgName">
              {kind === "creator" ? "Show name" : "Brand name"}
            </label>
            <input
              id="orgName"
              className={styles.input}
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={kind === "creator" ? "Unseriously" : "Acme Co"}
              autoComplete="organization"
            />
          </div>

          <div className={styles.kindRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="firstName">First name</label>
              <input
                id="firstName"
                className={styles.input}
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lastName">Last name</label>
              <input
                id="lastName"
                className={styles.input}
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </div>
          </div>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Request access"}
          </button>
        </form>

        <div className={styles.altLink}>
          Already have an account? <Link href="/studio/login">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
