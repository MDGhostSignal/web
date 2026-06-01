"use client";

import { useState, type FormEvent } from "react";

import { Button, Modal } from "@/components/admin";
import {
  MEMBER_OWNERS,
  MEMBER_PHASE_LABELS,
  MEMBER_PHASES,
  MEMBER_TYPE_LABELS,
  MEMBER_TYPES,
  type Member,
  type MemberPhase,
  type MemberType,
  type MemberWritable,
} from "@/lib/members";

import styles from "./MemberEditModal.module.css";

/**
 * Shared "edit member" modal used by both the Contacts page (the
 * full CRM list view) and the Marketplace pool (the expanded-row edit
 * action). Captures every editable Member field — identity, status,
 * shipping address (for mailing membership boxes), and notes.
 *
 * Owns its own draft state internally. The parent supplies the source
 * member + an `onSave(payload)` callback; the modal converts the form
 * to a `MemberWritable` and hands it back. Save / error handling lives
 * in the parent so it can also drive optimistic updates against its
 * member list.
 *
 * Pass `member={null}` to render the "create new" variant (only used
 * by the Contacts page — the marketplace pool only edits existing
 * members).
 */

type Props = {
  open: boolean;
  member: Member | null;
  isSaving: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSave: (payload: MemberWritable) => void;
};

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  member_type: MemberType;
  organization: string;
  role: string;
  website: string;
  phase: MemberPhase;
  owner: string;
  next_step: string;
  last_contact_at: string;
  contract_signed_at: string;
  contract_term_months: string;
  notes: string;
  tagsCsv: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
};

const EMPTY_FORM: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  member_type: "creator",
  organization: "",
  role: "",
  website: "",
  phase: "discern",
  owner: "",
  next_step: "",
  last_contact_at: "",
  contract_signed_at: "",
  contract_term_months: "12",
  notes: "",
  tagsCsv: "",
  shipping_address_line1: "",
  shipping_address_line2: "",
  shipping_city: "",
  shipping_state: "",
  shipping_postal_code: "",
  shipping_country: "",
};

function memberToForm(m: Member): FormState {
  return {
    first_name: m.first_name ?? "",
    last_name: m.last_name ?? "",
    email: m.email ?? "",
    phone: m.phone ?? "",
    member_type: m.member_type,
    organization: m.organization ?? "",
    role: m.role ?? "",
    website: m.website ?? "",
    phase: m.phase,
    owner: m.owner ?? "",
    next_step: m.next_step ?? "",
    last_contact_at: m.last_contact_at ? m.last_contact_at.slice(0, 10) : "",
    // Seed the contract sign date from lifecycle_steps.membership_signed
    // when the explicit column is blank — helps backfill historical
    // members who signed before the column existed.
    contract_signed_at: m.contract_signed_at
      ? m.contract_signed_at.slice(0, 10)
      : (m.lifecycle_steps?.membership_signed?.completed_at ?? ""),
    contract_term_months: String(m.contract_term_months ?? 12),
    notes: m.notes ?? "",
    tagsCsv: m.tags.join(", "),
    shipping_address_line1: m.shipping_address_line1 ?? "",
    shipping_address_line2: m.shipping_address_line2 ?? "",
    shipping_city: m.shipping_city ?? "",
    shipping_state: m.shipping_state ?? "",
    shipping_postal_code: m.shipping_postal_code ?? "",
    shipping_country: m.shipping_country ?? "",
  };
}

function formToPayload(f: FormState): MemberWritable {
  return {
    first_name: f.first_name.trim() || null,
    last_name: f.last_name.trim() || null,
    email: f.email.trim() || null,
    phone: f.phone.trim() || null,
    member_type: f.member_type,
    organization: f.organization.trim() || null,
    role: f.role.trim() || null,
    website: f.website.trim() || null,
    phase: f.phase,
    owner: f.owner.trim() || null,
    next_step: f.next_step.trim() || null,
    last_contact_at: f.last_contact_at ? f.last_contact_at : null,
    contract_signed_at: f.contract_signed_at ? f.contract_signed_at : null,
    contract_term_months: (() => {
      const n = Number(f.contract_term_months);
      return Number.isFinite(n) && n >= 1 && n <= 60 ? n : 12;
    })(),
    notes: f.notes.trim() || null,
    tags: f.tagsCsv
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    shipping_address_line1: f.shipping_address_line1.trim() || null,
    shipping_address_line2: f.shipping_address_line2.trim() || null,
    shipping_city: f.shipping_city.trim() || null,
    shipping_state: f.shipping_state.trim() || null,
    shipping_postal_code: f.shipping_postal_code.trim() || null,
    shipping_country: f.shipping_country.trim() || null,
  };
}

export function MemberEditModal({
  open,
  member,
  isSaving,
  errorMessage,
  onClose,
  onSave,
}: Props) {
  // Lazy useState initialiser snapshots the source member exactly once
  // per mount. Parent drives re-seeding by passing a stable `key` (e.g.
  // member.id) so opening the modal against a different member remounts
  // this component — that's the canonical "props-as-initial-state"
  // pattern and avoids the react-hooks/set-state-in-effect rule.
  const [form, setForm] = useState<FormState>(() =>
    member ? memberToForm(member) : EMPTY_FORM,
  );

  function up<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSave(formToPayload(form));
  }

  const editing = Boolean(member);

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!isSaving}
      size="xl"
      title={editing ? "Edit member" : "New contact"}
      subtitle={
        editing
          ? "Every field on this contact's record."
          : "At minimum, provide a first name, last name, or organization."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="member-edit-form"
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : editing ? "Update" : "Create"}
          </Button>
        </>
      }
    >
      <form
        id="member-edit-form"
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <div className={styles.formGrid}>
          <Field label="First name" htmlFor="first_name">
            <input
              id="first_name"
              className={styles.input}
              value={form.first_name}
              onChange={(e) => up("first_name", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="Last name" htmlFor="last_name">
            <input
              id="last_name"
              className={styles.input}
              value={form.last_name}
              onChange={(e) => up("last_name", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              className={styles.input}
              value={form.email}
              onChange={(e) => up("email", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <input
              id="phone"
              className={styles.input}
              value={form.phone}
              onChange={(e) => up("phone", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="Type" htmlFor="member_type">
            <select
              id="member_type"
              className={styles.select}
              value={form.member_type}
              onChange={(e) => up("member_type", e.target.value as MemberType)}
              disabled={isSaving}
            >
              {MEMBER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {MEMBER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Phase" htmlFor="phase">
            <select
              id="phase"
              className={styles.select}
              value={form.phase}
              onChange={(e) => up("phase", e.target.value as MemberPhase)}
              disabled={isSaving}
            >
              {MEMBER_PHASES.map((p) => (
                <option key={p} value={p}>
                  {MEMBER_PHASE_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Organization" htmlFor="organization">
            <input
              id="organization"
              className={styles.input}
              value={form.organization}
              onChange={(e) => up("organization", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="Role" htmlFor="role">
            <input
              id="role"
              className={styles.input}
              value={form.role}
              onChange={(e) => up("role", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="Website" htmlFor="website">
            <input
              id="website"
              className={styles.input}
              placeholder="https://…"
              value={form.website}
              onChange={(e) => up("website", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="Owner" htmlFor="owner">
            <select
              id="owner"
              className={styles.select}
              value={form.owner}
              onChange={(e) => up("owner", e.target.value)}
              disabled={isSaving}
            >
              <option value="">Unassigned</option>
              {MEMBER_OWNERS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Next step" htmlFor="next_step">
            <input
              id="next_step"
              className={styles.input}
              placeholder="e.g. Send intro deck"
              value={form.next_step}
              onChange={(e) => up("next_step", e.target.value)}
              disabled={isSaving}
            />
          </Field>
          <Field label="Last contact" htmlFor="last_contact_at">
            <input
              id="last_contact_at"
              type="date"
              className={styles.input}
              value={form.last_contact_at}
              onChange={(e) => up("last_contact_at", e.target.value)}
              disabled={isSaving}
            />
          </Field>

          <Field label="Contract signed" htmlFor="contract_signed_at">
            <input
              id="contract_signed_at"
              type="date"
              className={styles.input}
              value={form.contract_signed_at}
              onChange={(e) => up("contract_signed_at", e.target.value)}
              disabled={isSaving}
            />
          </Field>

          <Field label="Contract term (months)" htmlFor="contract_term_months">
            <input
              id="contract_term_months"
              type="number"
              min={1}
              max={60}
              step={1}
              className={styles.input}
              value={form.contract_term_months}
              onChange={(e) => up("contract_term_months", e.target.value)}
              disabled={isSaving}
              placeholder="12"
            />
          </Field>
        </div>

        <div className={styles.formGroupFull}>
          <label className={styles.label} htmlFor="tags">
            Tags
          </label>
          <input
            id="tags"
            className={styles.input}
            placeholder="Comma-separated: podcast, climate, intro-call"
            value={form.tagsCsv}
            onChange={(e) => up("tagsCsv", e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className={styles.formGroupFull}>
          <label className={styles.label} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className={styles.textarea}
            rows={3}
            value={form.notes}
            onChange={(e) => up("notes", e.target.value)}
            disabled={isSaving}
          />
        </div>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Shipping address</h3>
            <span className={styles.sectionHint}>
              For mailing membership boxes + swag. Optional.
            </span>
          </header>
          <div className={styles.formGroupFull}>
            <label className={styles.label} htmlFor="shipping_address_line1">
              Street address
            </label>
            <input
              id="shipping_address_line1"
              className={styles.input}
              placeholder="123 Main St"
              value={form.shipping_address_line1}
              onChange={(e) => up("shipping_address_line1", e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className={styles.formGroupFull}>
            <label className={styles.label} htmlFor="shipping_address_line2">
              Apt / suite (optional)
            </label>
            <input
              id="shipping_address_line2"
              className={styles.input}
              placeholder="Suite 200"
              value={form.shipping_address_line2}
              onChange={(e) => up("shipping_address_line2", e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className={styles.formGrid}>
            <Field label="City" htmlFor="shipping_city">
              <input
                id="shipping_city"
                className={styles.input}
                value={form.shipping_city}
                onChange={(e) => up("shipping_city", e.target.value)}
                disabled={isSaving}
              />
            </Field>
            <Field label="State / Province" htmlFor="shipping_state">
              <input
                id="shipping_state"
                className={styles.input}
                value={form.shipping_state}
                onChange={(e) => up("shipping_state", e.target.value)}
                disabled={isSaving}
              />
            </Field>
            <Field label="Postal code" htmlFor="shipping_postal_code">
              <input
                id="shipping_postal_code"
                className={styles.input}
                value={form.shipping_postal_code}
                onChange={(e) => up("shipping_postal_code", e.target.value)}
                disabled={isSaving}
              />
            </Field>
            <Field label="Country" htmlFor="shipping_country">
              <input
                id="shipping_country"
                className={styles.input}
                placeholder="United States"
                value={form.shipping_country}
                onChange={(e) => up("shipping_country", e.target.value)}
                disabled={isSaving}
              />
            </Field>
          </div>
        </section>

        {errorMessage && <div className={styles.error}>{errorMessage}</div>}
      </form>
    </Modal>
  );
}

/* --- Internals ----------------------------------------------------- */

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.formGroup}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
