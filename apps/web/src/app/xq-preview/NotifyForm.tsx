"use client";

import { useState, type FormEvent } from "react";

import styles from "./page.module.css";

export function NotifyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus("idle");
    setErrorMessage("");

    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();

    try {
      const response = await fetch("/api/xq-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string };

      if (response.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status === "success") {
    return (
      <p className={styles.notifySuccess} role="status">
        You are on the list. We will email you when the new XQ goes live.
      </p>
    );
  }

  return (
    <form className={styles.notifyForm} onSubmit={handleSubmit} noValidate>
      <label className={styles.notifyLabel} htmlFor="xq-notify-email">
        Email
      </label>
      <div className={styles.notifyRow}>
        <input
          id="xq-notify-email"
          className={styles.notifyInput}
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          disabled={isSubmitting}
        />
        <button className={styles.notifySubmit} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Notify me"}
        </button>
      </div>
      {status === "error" ? (
        <p className={styles.notifyError} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
