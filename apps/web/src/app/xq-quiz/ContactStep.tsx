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

/**
 * Basics capture step — same field set as the RQ contact step
 * (first / last / email / org / role / type + optional industry +
 * website). Used both to gate the quiz and to write the "incomplete"
 * lead row server-side so a half-finished user is still captured.
 */
export function ContactStep({ initial, onSubmit }: Props) {
  const [b, setB] = useState<Basics>(initial);
  const [showErr, setShowErr] = useState(false);

  const isValid = Boolean(
    b.first.trim() &&
      b.last.trim() &&
      b.email.trim() &&
      b.email.includes("@") &&
      b.org.trim() &&
      b.type,
  );

  function up<K extends keyof Basics>(key: K, value: Basics[K]) {
    setB((prev) => ({ ...prev, [key]: value }));
    if (showErr) setShowErr(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      setShowErr(true);
      return;
    }
    void onSubmit(b);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="xq-stage-title">Let&apos;s start with the basics</h2>
      <p className="xq-stage-lede">
        Quick context so we can route your results back to you and link
        them to your record in the matching matrix.
      </p>

      <div className="xq-field-grid-2">
        <div className="xq-field">
          <label htmlFor="xq-first">First name *</label>
          <input
            id="xq-first"
            value={b.first}
            onChange={(e) => up("first", e.target.value)}
            autoComplete="given-name"
            required
          />
        </div>
        <div className="xq-field">
          <label htmlFor="xq-last">Last name *</label>
          <input
            id="xq-last"
            value={b.last}
            onChange={(e) => up("last", e.target.value)}
            autoComplete="family-name"
            required
          />
        </div>
      </div>

      <div className="xq-field">
        <label htmlFor="xq-email">Email *</label>
        <input
          id="xq-email"
          type="email"
          value={b.email}
          onChange={(e) => up("email", e.target.value)}
          autoComplete="email"
          required
        />
      </div>

      <div className="xq-field-grid-2">
        <div className="xq-field">
          <label htmlFor="xq-org">Organization *</label>
          <input
            id="xq-org"
            value={b.org}
            onChange={(e) => up("org", e.target.value)}
            autoComplete="organization"
            required
          />
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

      <div className="xq-field">
        <label htmlFor="xq-type">You are a... *</label>
        <select
          id="xq-type"
          value={b.type}
          onChange={(e) => up("type", e.target.value)}
          required
        >
          <option value="">Choose…</option>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {showErr && (
        <div className="xq-err" role="alert">
          Please fill the required fields (first, last, email, organization, type).
        </div>
      )}

      <button type="submit" className="xq-btn" disabled={!isValid && showErr}>
        Continue to Phase 1 →
      </button>
    </form>
  );
}
