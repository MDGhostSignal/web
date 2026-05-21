/**
 * Shared TypeScript types for the Mercury (mercury.com) integration plus
 * currency helpers used by both the sync layer and the dashboard.
 *
 * Currency contract — read this before touching anything that handles
 * money in this codebase:
 *
 *  - Postgres stores balances and transaction amounts as numeric(20,4).
 *  - PostgREST returns numeric values as JSON numbers by default, but
 *    we coerce to strings on the way in (see `mercury-sync.ts`) and
 *    keep them as strings on the wire to avoid IEEE-754 drift on
 *    values like 1234567.89 → 1234567.8899999999.
 *  - All arithmetic uses bigint cents (×10_000 for 4 decimals of
 *    precision). Convert exactly once on parse and once on format.
 *  - Never call `Number(amount)` or `parseFloat(amount)` on Mercury
 *    money values anywhere in the codebase.
 */

/* --- Mercury API JSON shapes -----------------------------------------
 *
 * These mirror Mercury's documented response shapes (docs.mercury.com).
 * Fields not used by the dashboard are typed loosely as `unknown` —
 * the full original payload is preserved in `raw` jsonb in Supabase so
 * we can reach back for anything later without re-querying Mercury.
 * --------------------------------------------------------------------- */

export interface MercuryAccount {
  id: string;
  name: string;
  /** "checking" | "savings" | "treasury" | "iolta" | ... */
  kind?: string | null;
  /** Full account number — masked client-side, never persisted in full. */
  accountNumber?: string | null;
  /** Mercury returns these as JSON numbers; we keep them as strings. */
  availableBalance: string;
  currentBalance: string;
  currency: string;
  /** "ACTIVE" | "ARCHIVED" | ... */
  status?: string | null;
}

export interface MercuryTransaction {
  id: string;
  accountId?: string;
  /** Posted timestamp (ISO 8601). May be null while pending. */
  postedAt?: string | null;
  /** Creation timestamp (ISO 8601). Always present. */
  createdAt: string;
  /** Signed string — positive = inflow into the account, negative = outflow. */
  amount: string;
  /** Mercury transaction kind: "externalTransfer", "internalTransfer", "card", "fee", ... */
  kind?: string | null;
  counterpartyName?: string | null;
  counterpartyNickname?: string | null;
  bankDescription?: string | null;
  /** "pending" | "sent" | "posted" | "failed" | "cancelled" */
  status: string;
  note?: string | null;
}

/* --- Supabase row shapes (what the dashboard consumes) --------------- */

export interface MercuryAccountRow {
  id: string;
  name: string;
  kind: string | null;
  account_number_masked: string | null;
  available_balance: string;
  current_balance: string;
  currency: string;
  status: string | null;
  raw: unknown;
  updated_at: string;
}

export interface MercuryTransactionRow {
  id: string;
  account_id: string;
  posted_at: string | null;
  created_at: string;
  amount: string;
  kind: string | null;
  counterparty_name: string | null;
  counterparty_nickname: string | null;
  bank_description: string | null;
  status: string;
  note: string | null;
  raw: unknown;
  updated_at: string;
}

export interface MercurySyncRunRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "ok" | "error";
  account_count: number | null;
  transaction_count: number | null;
  error_message: string | null;
}

/* --- Currency helpers ------------------------------------------------- */

// 4 decimals — matches numeric(20,4). Written as `BigInt(10000)` rather
// than the `10_000n` literal because the project targets ES2017; bigint
// literals require ES2020.
const CENTS_SCALE = BigInt(10000);
const BIGINT_ZERO = BigInt(0);
const BIGINT_ONE = BigInt(1);
const BIGINT_HUNDRED = BigInt(100);

/**
 * Convert a money string (e.g. "1234.56", "-0.0001", "1234567.8901") to a
 * bigint of "cents" at 4 decimals of precision. Throws on garbage input
 * rather than silently truncating — financial data deserves loud failures.
 */
export function parseAmountCents(value: string | number): bigint {
  const str = typeof value === "number" ? String(value) : value.trim();
  if (!str) throw new Error("parseAmountCents: empty input");

  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(str);
  if (!match) throw new Error(`parseAmountCents: invalid money string "${str}"`);

  const sign = match[1] === "-" ? -BIGINT_ONE : BIGINT_ONE;
  const whole = BigInt(match[2]);
  const fractionRaw = match[3] ?? "";
  // Pad or truncate to 4 decimals.
  const fraction = (fractionRaw + "0000").slice(0, 4);
  const cents = whole * CENTS_SCALE + BigInt(fraction);
  return sign * cents;
}

/**
 * Format a bigint cents value (returned by parseAmountCents) into a
 * locale-aware currency string. Uses Intl.NumberFormat under the hood;
 * splits into integer + fraction strings so we never round-trip through
 * Number.
 */
export function formatCents(
  cents: bigint,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  const negative = cents < BIGINT_ZERO;
  const abs = negative ? -cents : cents;
  const whole = abs / CENTS_SCALE;
  const frac = abs % CENTS_SCALE;

  // We display 2 fractional digits for currency UI (standard). The
  // underlying precision is preserved in the database.
  const fracTwoDigits = (frac / BIGINT_HUNDRED).toString().padStart(2, "0");
  const wholeFormatted = new Intl.NumberFormat(locale).format(whole);
  const body = `${wholeFormatted}.${fracTwoDigits}`;

  // Pick a currency symbol via Intl.NumberFormat for unfamiliar codes.
  const symbol = currencySymbol(currency, locale);
  return `${negative ? "-" : ""}${symbol}${body}`;
}

function currencySymbol(currency: string, locale: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    const sym = parts.find((p) => p.type === "currency");
    return sym?.value ?? `${currency} `;
  } catch {
    return `${currency} `;
  }
}

/**
 * Sum a list of money strings, returning bigint cents. Empty list → 0n.
 */
export function sumAmountsCents(values: ReadonlyArray<string>): bigint {
  let total = BIGINT_ZERO;
  for (const v of values) total += parseAmountCents(v);
  return total;
}

/**
 * Mask an account number to last-4 with bullet-prefix. Returns "" for
 * empty / unknown so the UI can fall back to the account `name`.
 */
export function maskAccountNumber(full: string | null | undefined): string {
  if (!full) return "";
  const digits = full.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `••••${digits.slice(-4)}`;
}

/**
 * Render a relative-time string for the "last synced X ago" pill.
 * Past-only — we never look ahead. Returns "just now" for under a
 * minute, then minutes / hours / days. No emojis, no localization
 * variability (this is internal tooling for an English-speaking team).
 */
export function formatRelativeTimePast(
  isoTimestamp: string | null | undefined,
  now: number = Date.now(),
): string {
  if (!isoTimestamp) return "never";
  const then = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(then)) return "never";

  const deltaMs = Math.max(0, now - then);
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
