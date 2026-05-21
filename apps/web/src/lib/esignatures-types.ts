/**
 * Shared TypeScript types for the esignatures.com integration.
 *
 * Mirrors the Supabase schema in docs/CONTRACTS_SUPABASE_SCHEMA.sql
 * plus the wire shapes esignatures.com returns. Field names follow
 * esignatures.com's snake_case convention on the API side; DB rows
 * follow the Postgres snake_case convention which happens to be the
 * same here.
 */

/* ---------------- Status enum ---------------- */

/**
 * Contract status as it appears in our local cache. esignatures.com
 * uses these same strings on the wire. `completed` is a synonym some
 * tooling uses for `signed` once all signers have acted; we keep both
 * in the enum and treat them as equivalent in the UI.
 */
export type ContractStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "signed"
  | "declined"
  | "expired"
  | "withdrawn"
  | "completed";

export const CONTRACT_STATUSES: ReadonlyArray<ContractStatus> = [
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "expired",
  "withdrawn",
  "completed",
] as const;

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  declined: "Declined",
  expired: "Expired",
  withdrawn: "Withdrawn",
  completed: "Completed",
};

/** Statuses considered "in flight" — still awaiting signer action. */
export const CONTRACT_AWAITING_STATUSES: ReadonlyArray<ContractStatus> = [
  "sent",
  "viewed",
] as const;

/** Statuses considered "active" — signed/completed and not archived. */
export const CONTRACT_ACTIVE_STATUSES: ReadonlyArray<ContractStatus> = [
  "signed",
  "completed",
] as const;

/* ---------------- Counterparty kind ---------------- */

export type ContractCounterpartyKind = "creator" | "brand" | "other";

export const COUNTERPARTY_KINDS: ReadonlyArray<ContractCounterpartyKind> = [
  "creator",
  "brand",
  "other",
] as const;

export const COUNTERPARTY_KIND_LABELS: Record<ContractCounterpartyKind, string> = {
  creator: "Creator",
  brand: "Brand",
  other: "Other",
};

/* ---------------- Wire shapes — esignatures.com API ---------------- */

/**
 * The shape esignatures.com returns under `data.contract`. Most fields
 * are optional because esignatures only includes them when relevant
 * (e.g. `signed_at` is absent on a draft, `contract_pdf_url` is absent
 * until at least one signer has signed).
 */
export interface EsignaturesContract {
  id: string;
  template_id?: string | null;
  title?: string | null;
  status: ContractStatus | string; // tolerant: API may add new states
  metadata?: Record<string, unknown> | null;
  source?: string | null;
  test?: boolean;
  contract_pdf_url?: string | null;
  labels?: string[];
  signers: EsignaturesSigner[];
  // Date-ish fields. esignatures returns ISO strings; we trust them
  // verbatim and parse on the way into Postgres.
  created_at?: string | null;
  sent_at?: string | null;
  signed_at?: string | null;
  withdrawn_at?: string | null;
  expires_at?: string | null;
  // Some templates surface effective dates via placeholder values; we
  // pull those into a separate column at sync time, not from this
  // shape directly.
  placeholder_fields?: EsignaturesPlaceholderField[];
}

export interface EsignaturesSigner {
  id: string;
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  company_name?: string | null;
  signing_order?: number | null;
  status: string; // 'sent' | 'viewed' | 'signed' | 'declined' (verbatim)
  sign_page_url?: string | null;
  viewed_at?: string | null;
  signed_at?: string | null;
}

/**
 * Template-level placeholder definitions. The exact shape varies by
 * template — fields may carry a `type`, a default `value`, a `label`,
 * etc. We treat the whole object as opaque jsonb in the DB.
 */
export interface EsignaturesPlaceholderField {
  api_key?: string;
  type?: string;
  label?: string;
  default_value?: string;
  required?: boolean;
  options?: string[];
  [key: string]: unknown;
}

export interface EsignaturesTemplate {
  template_id: string;
  title: string;
  created_at?: string | null;
  labels?: string[];
  placeholder_fields?: EsignaturesPlaceholderField[];
  signer_field_ids?: unknown[];
}

/* ---------------- DB row shapes (what the dashboard consumes) ---------------- */

export interface ContractRow {
  id: string;
  template_id: string | null;
  title: string | null;
  status: ContractStatus;
  counterparty_kind: ContractCounterpartyKind | null;
  member_id: string | null;
  suggested_member_id: string | null;
  sent_at: string | null;
  signed_at: string | null;
  withdrawn_at: string | null;
  effective_date: string | null;
  expires_at: string | null;
  archived_at: string | null;
  notes: string | null;
  raw: unknown;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ContractSignerRow {
  id: string;
  contract_id: string;
  name: string | null;
  email: string | null;
  status: string;
  signing_order: number | null;
  viewed_at: string | null;
  signed_at: string | null;
  raw: unknown;
  created_at: string;
}

export interface ContractTemplateRow {
  id: string;
  title: string;
  placeholder_fields: EsignaturesPlaceholderField[] | null;
  signer_field_ids: unknown[] | null;
  labels: string[];
  raw: unknown;
  created_at: string | null;
  updated_at: string;
}

export interface ContractWithSigners extends ContractRow {
  signers: ContractSignerRow[];
}

/* ---------------- Helpers ---------------- */

/** Map a wire-side status string to our typed enum, falling back to "draft" for unknown values rather than throwing. */
export function normalizeStatus(raw: string | undefined | null): ContractStatus {
  if (!raw) return "draft";
  const lower = raw.toLowerCase();
  if ((CONTRACT_STATUSES as readonly string[]).includes(lower)) {
    return lower as ContractStatus;
  }
  return "draft";
}

/** Pull a Date out of a possibly-undefined ISO string. */
export function parseIsoOrNull(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
