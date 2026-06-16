"use client";

import type { EsignaturesPlaceholderField } from "@/lib/esignatures-types";

import styles from "../contracts.module.css";

type Props = {
  fields: EsignaturesPlaceholderField[] | null | undefined;
  values: Record<string, string>;
  onChange: (api_key: string, value: string) => void;
  disabled?: boolean;
};

/**
 * Dynamic renderer for template `placeholder_fields`. The shape varies
 * per template, so we inspect each field's `type` and pick an appropriate
 * input:
 *
 *   - "date"     → <input type="date">
 *   - "number"   → <input type="number">
 *   - "checkbox" → <input type="checkbox"> (stored as "true" / "false")
 *   - anything else (text, signature, unknown) → <input type="text">
 *
 * Unknown types are surfaced as a small warning under the field — the
 * admin still gets a usable input rather than a silent crash.
 *
 * If `fields` is empty (the corpus has at least one such template), we
 * render a single-line hint and the parent can move straight to the
 * signers + submit step.
 */
export function TemplateFieldsRenderer({
  fields,
  values,
  onChange,
  disabled,
}: Props) {
  if (!fields || fields.length === 0) {
    return (
      <div className={styles.formHint}>
        This template has no placeholder fields — go straight to signers.
      </div>
    );
  }

  return (
    <div className={styles.formField}>
      <div className={styles.formLabel}>Template fields</div>
      <div className={styles.signersList}>
        {fields.map((f, idx) => {
          const key = f.api_key ?? `field-${idx}`;
          if (!f.api_key) {
            return (
              <div key={key} className={styles.formHint}>
                Skipping field with no api_key.
              </div>
            );
          }
          const value = values[f.api_key] ?? (f.default_value ?? "");
          const fieldType = (f.type ?? "text").toLowerCase();
          return (
            <div key={key} className={styles.formField}>
              <label
                className={styles.formLabel}
                htmlFor={`tpl-field-${f.api_key}`}
              >
                {f.label ?? f.api_key}
                {f.required && <span aria-label="required"> *</span>}
              </label>
              {renderInput(
                fieldType,
                f.api_key,
                value,
                (next) => onChange(f.api_key!, next),
                disabled,
                f.options,
              )}
              {isUnsupported(fieldType) && (
                <div className={styles.formHint}>
                  Field type “{fieldType}” isn’t natively supported — value is
                  passed through as text.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderInput(
  type: string,
  apiKey: string,
  value: string,
  setValue: (v: string) => void,
  disabled: boolean | undefined,
  options: string[] | undefined,
) {
  const id = `tpl-field-${apiKey}`;
  switch (type) {
    case "date":
      return (
        <input
          id={id}
          type="date"
          className={styles.formInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
        />
      );
    case "number":
      return (
        <input
          id={id}
          type="number"
          className={styles.formInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
        />
      );
    case "checkbox":
      return (
        <label
          style={{ display: "flex", alignItems: "center", gap: 8 }}
          htmlFor={id}
        >
          <input
            id={id}
            type="checkbox"
            checked={value === "true"}
            onChange={(e) => setValue(e.target.checked ? "true" : "false")}
            disabled={disabled}
          />
          <span>{value === "true" ? "Yes" : "No"}</span>
        </label>
      );
    case "select":
    case "dropdown":
      return (
        <select
          id={id}
          className={styles.formInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
        >
          <option value="">— Choose —</option>
          {(options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    default:
      return (
        <input
          id={id}
          type="text"
          className={styles.formInput}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
        />
      );
  }
}

function isUnsupported(type: string): boolean {
  return ![
    "text",
    "string",
    "date",
    "number",
    "checkbox",
    "select",
    "dropdown",
    "signature",
  ].includes(type);
}
