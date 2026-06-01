"use client";

import { useState } from "react";

import type { Basics } from "./types";

type Props = {
  initial: Basics;
  /** Called once the user clicks Continue with a valid basics block. */
  onSubmit: (basics: Basics) => void | Promise<void>;
};

const TYPE_OPTIONS = [
  { value: "creator", label: "Creator / Independent Voice" },
  { value: "brand", label: "Brand / Business Operator" },
  { value: "other", label: "Other" },
];

type FieldKey = "first" | "last" | "email" | "org" | "type";
type FieldErrors = Partial<Record<FieldKey, string>>;

function validate(b: Basics): FieldErrors {
  const errs: FieldErrors = {};
  if (!b.first.trim()) errs.first = "First name is required.";
  if (!b.last.trim()) errs.last = "Last name is required.";
  if (!b.email.trim()) errs.email = "Email is required.";
  else if (!b.email.includes("@")) errs.email = "Enter a valid email address.";
  if (!b.org.trim()) errs.org = "Organization is required.";
  if (!b.type) errs.type = "Please choose one.";
  return errs;
}

/**
 * Basics capture step — same field set as the RQ contact step
 * (first / last / email / org / role / type + optional industry +
 * website). Used both to gate the quiz and to write the "incomplete"
 * lead row server-side so a half-finished user is still captured.
 */
export function ContactStep({ initial, onSubmit }: Props) {
  const [b, setB] = useState<Basics>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});

  function up<K extends keyof Basics>(key: K, value: Basics[K]) {
    setB((prev) => ({ ...prev, [key]: value }));
    // Clear the error for this field as soon as the user edits it.
    if (key in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as FieldKey];
        return next;
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(b);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0] as FieldKey;
      const el = document.getElementById(`xq-${firstKey}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }
    setErrors({});
    void onSubmit(b);
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 className="xq-stage-title">Let&apos;s start with the basics</h2>
      <p className="xq-stage-lede">
        Quick context so we can route your results back to you and link
        them to your record in the matching matrix.
      </p>

      <div className="xq-field-grid-2">
        <div className={`xq-field ${errors.first ? "invalid" : ""}`}>
          <label htmlFor="xq-first">First name *</label>
          <input
            id="xq-first"
            value={b.first}
            onChange={(e) => up("first", e.target.value)}
            autoComplete="given-name"
            aria-invalid={errors.first ? true : undefined}
            aria-describedby={errors.first ? "xq-first-err" : undefined}
          />
          {errors.first && (
            <span id="xq-first-err" className="xq-field-error">
              {errors.first}
            </span>
          )}
        </div>
        <div className={`xq-field ${errors.last ? "invalid" : ""}`}>
          <label htmlFor="xq-last">Last name *</label>
          <input
            id="xq-last"
            value={b.last}
            onChange={(e) => up("last", e.target.value)}
            autoComplete="family-name"
            aria-invalid={errors.last ? true : undefined}
            aria-describedby={errors.last ? "xq-last-err" : undefined}
          />
          {errors.last && (
            <span id="xq-last-err" className="xq-field-error">
              {errors.last}
            </span>
          )}
        </div>
      </div>

      <div className={`xq-field ${errors.email ? "invalid" : ""}`}>
        <label htmlFor="xq-email">Email *</label>
        <input
          id="xq-email"
          type="email"
          value={b.email}
          onChange={(e) => up("email", e.target.value)}
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "xq-email-err" : undefined}
        />
        {errors.email && (
          <span id="xq-email-err" className="xq-field-error">
            {errors.email}
          </span>
        )}
      </div>

      <div className="xq-field-grid-2">
        <div className={`xq-field ${errors.org ? "invalid" : ""}`}>
          <label htmlFor="xq-org">Organization *</label>
          <input
            id="xq-org"
            value={b.org}
            onChange={(e) => up("org", e.target.value)}
            autoComplete="organization"
            aria-invalid={errors.org ? true : undefined}
            aria-describedby={errors.org ? "xq-org-err" : undefined}
          />
          {errors.org && (
            <span id="xq-org-err" className="xq-field-error">
              {errors.org}
            </span>
          )}
        </div>
        <div className="xq-field">
          <label htmlFor="xq-role">Role</label>
          <input
            id="xq-role"
            value={b.role}
            onChange={(e) => up("role", e.target.value)}
            autoComplete="organization-title"
          />
        </div>
      </div>

      <div className="xq-field-grid-2">
        <div className="xq-field">
          <label htmlFor="xq-industry">Industry</label>
          <input
            id="xq-industry"
            value={b.industry}
            onChange={(e) => up("industry", e.target.value)}
          />
        </div>
        <div className="xq-field">
          <label htmlFor="xq-website">Website</label>
          <input
            id="xq-website"
            type="url"
            value={b.website}
            onChange={(e) => up("website", e.target.value)}
            autoComplete="url"
            placeholder="https://"
          />
        </div>
      </div>

      <div className={`xq-field ${errors.type ? "invalid" : ""}`}>
        <label htmlFor="xq-type">You are a... *</label>
        <select
          id="xq-type"
          value={b.type}
          onChange={(e) => up("type", e.target.value)}
          aria-invalid={errors.type ? true : undefined}
          aria-describedby={errors.type ? "xq-type-err" : undefined}
        >
          <option value="">Choose…</option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <span id="xq-type-err" className="xq-field-error">
            {errors.type}
          </span>
        )}
      </div>

      {errorCount > 0 && (
        <div className="xq-err" role="alert">
          {errorCount === 1
            ? "1 field needs your attention — see highlight above."
            : `${errorCount} fields need your attention — see highlights above.`}
        </div>
      )}

      <button type="submit" className="xq-btn">
        Continue to Phase 1 →
      </button>
    </form>
  );
}
