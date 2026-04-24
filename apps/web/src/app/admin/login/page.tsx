"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button, ErrorCard } from "@/components/admin";

import styles from "./login.module.css";

/**
 * Minimal shared-password sign-in for the admin shell. Posts the
 * password to /api/admin/login; on success the server issues the
 * signed auth cookie and we redirect to `?next=...` (or /admin).
 *
 * This page is reachable by anyone (the middleware whitelists it),
 * so it's designed to leak nothing back: the same 600ms delay fires
 * on every failure, and the error is generic.
 *
 * The inner component reads `?next` via `useSearchParams()`, which
 * in Next.js 16 requires a Suspense boundary or the page can't be
 * statically prerendered (CSR bailout error at build time). The
 * default export wraps the form in <Suspense> for exactly that.
 */
export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams?.get("next") ?? "/admin";
  // Sanitise client-side too — server does the real check.
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//")
    ? rawNext
    : "/admin";

  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Invalid password.");
        return;
      }
      router.replace(typeof data.next === "string" ? data.next : "/admin");
      router.refresh();
    } catch {
      setError("Failed to reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`${styles.page} admin-root`}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandName}>GhostSignal</span>
          <span className={styles.brandTag}>Admin</span>
        </div>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>
          Enter the shared team password to access internal tools.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label} htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            disabled={submitting}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
          />

          {error && <ErrorCard>{error}</ErrorCard>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting || !password}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}

/**
 * Fallback rendered while the search-params-dependent form is
 * suspended. Matches the chrome of the real form so there's no
 * layout shift when hydration completes.
 */
function LoginShell() {
  return (
    <main className={`${styles.page} admin-root`}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandName}>GhostSignal</span>
          <span className={styles.brandTag}>Admin</span>
        </div>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>
          Enter the shared team password to access internal tools.
        </p>
      </div>
    </main>
  );
}
