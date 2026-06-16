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
type SuccessState = {
  email: string;
  needsEmailConfirmation: boolean;
};

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
  const [success, setSuccess] = useState<SuccessState | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createStudioBrowserClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Points the confirmation link at our server route, which
          // exchanges the PKCE code for a session and redirects into
          // /studio. Without this, Supabase falls back to Site URL (/)
          // where nothing consumes the code and the user sees nothing.
          // The URL must also be in Supabase's Redirect URLs allowlist.
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) {
        // Surface Supabase auth errors with the most informative
        // value we can extract. The SDK sometimes returns an
        // AuthApiError whose `message` is descriptive, sometimes an
        // object that stringifies to "[object Object]" or "{}".
        // Log the raw error so DevTools console shows the full
        // payload for debugging.
        console.error("[studio/register] signUp authError:", authError);
        const msg =
          (authError as { message?: string }).message ||
          (authError as { error_description?: string }).error_description ||
          JSON.stringify(authError);
        throw new Error(msg && msg !== "{}" ? msg : "Supabase auth rejected the sign-up. Check the browser console for details.");
      }
      if (!data.user) {
        console.error("[studio/register] signUp returned no user:", data);
        throw new Error("Registration failed: no user returned from Supabase.");
      }

      // Server-side member-row create/link. Verifies the new
      // authUserId via the Supabase admin API — works whether or
      // not the browser got a session from signUp (Supabase doesn't
      // create a session when email confirmation is required).
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
        console.error("[studio/register] /api/studio/register failed:", res.status, body);
        const msg =
          typeof body?.error === "string" && body.error.length > 0
            ? body.error
            : `Registration sync failed (HTTP ${res.status}). Check the browser console for the full response.`;
        throw new Error(msg);
      }

      // Surface a positive confirmation state instead of silently
      // redirecting — the user just gave us credentials and deserves
      // to see that it landed. The CTA on the success card routes
      // them to the right next step based on whether Supabase
      // produced a session (email confirmation on/off).
      setSuccess({ email, needsEmailConfirmation: !data.session });
    } catch (err) {
      console.error("[studio/register] caught error:", err);
      let msg = "Unknown error during registration.";
      if (err instanceof Error && err.message) {
        msg = err.message;
      } else if (typeof err === "string" && err.length > 0) {
        msg = err;
      } else if (err && typeof err === "object") {
        const obj = err as { message?: string; error?: string };
        msg = obj.message || obj.error || "Unknown error (see browser console).";
      }
      setError(msg);
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className={styles.authPage}>
        <div className={styles.authCard} style={{ textAlign: "center" }}>
          <div className={styles.successIcon} aria-hidden="true">✓</div>
          <h1 className={styles.title}>Request received</h1>
          <p className={styles.subtitle}>
            {success.needsEmailConfirmation ? (
              <>
                We sent a confirmation link to{" "}
                <strong>{success.email}</strong>. Click it to verify
                your email, then sign in.
              </>
            ) : (
              <>
                Your account is registered as{" "}
                <strong>{success.email}</strong>. A GhostSignal
                co-founder will approve your access shortly — you&apos;ll
                see your dashboard the moment they do.
              </>
            )}
          </p>
          <button
            type="button"
            className={styles.submit}
            onClick={() => {
              router.replace(
                success.needsEmailConfirmation
                  ? "/studio/login?registered=1"
                  : "/studio/pending",
              );
            }}
          >
            {success.needsEmailConfirmation ? "Continue to sign in" : "Continue"}
          </button>
        </div>
      </main>
    );
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
