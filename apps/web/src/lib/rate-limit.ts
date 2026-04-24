/**
 * Best-effort in-memory rate limiter.
 *
 * Intended for low-traffic admin endpoints where a serverless-native
 * distributed limiter (Vercel KV / Upstash Redis) would be overkill.
 * Each warm Next.js function instance keeps its own Map of offenders,
 * so a determined attacker distributing attempts across cold starts
 * can partially bypass this. The tradeoff:
 *
 *  - On a trivial brute-force from a single client, this catches it.
 *  - On a distributed attack, it's imperfect — but combined with the
 *    600ms deliberate delay in verifyAdminPassword failures and a
 *    long random password, it still raises the cost of brute-force
 *    to infeasible levels.
 *
 * When the team grows or the admin URL is publicly advertised, swap
 * the storage (lines marked "STORAGE:") for Vercel KV or Upstash so
 * the limiter is consistent across serverless instances.
 */

type Entry = {
  /** Timestamps of recent failures inside the sliding window. */
  failures: number[];
  /** If non-null, key is locked until this epoch-ms time. */
  lockedUntil: number | null;
};

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

type Options = {
  /** Sliding window size, ms. */
  windowMs: number;
  /** Max failures per window before locking. */
  maxFailures: number;
  /** Lock duration once triggered, ms. */
  lockMs: number;
};

const DEFAULT_OPTS: Options = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxFailures: 5,
  lockMs: 15 * 60 * 1000, // 15 minutes
};

// STORAGE: in-memory Map. Swap for KV when traffic + threat model
// warrant it (see module header).
const store = new Map<string, Entry>();

/**
 * Opportunistic cleanup — sweep stale entries so the Map doesn't grow
 * unbounded. Called on every check; O(n) but n stays small for the
 * admin login use case and the sweep is cheap.
 */
function sweep(now: number, windowMs: number) {
  for (const [k, e] of store) {
    const isLocked = e.lockedUntil !== null && e.lockedUntil > now;
    const hasRecent = e.failures.some((t) => now - t < windowMs);
    if (!isLocked && !hasRecent) store.delete(k);
  }
}

/**
 * Check whether `key` may proceed with an attempt right now.
 * Does NOT record anything — call recordFailure/clearKey after.
 */
export function checkRateLimit(
  key: string,
  opts: Partial<Options> = {},
): RateLimitResult {
  const o = { ...DEFAULT_OPTS, ...opts };
  const now = Date.now();
  sweep(now, o.windowMs);

  const entry = store.get(key);
  if (!entry) return { ok: true, remaining: o.maxFailures };

  if (entry.lockedUntil !== null && entry.lockedUntil > now) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  // Lock expired — clear it.
  if (entry.lockedUntil !== null && entry.lockedUntil <= now) {
    entry.lockedUntil = null;
    entry.failures = [];
  }

  const recent = entry.failures.filter((t) => now - t < o.windowMs);
  entry.failures = recent;
  return { ok: true, remaining: Math.max(0, o.maxFailures - recent.length) };
}

/**
 * Record a failed attempt for `key`. If the count now exceeds the
 * threshold, sets a lock.
 */
export function recordFailure(
  key: string,
  opts: Partial<Options> = {},
): RateLimitResult {
  const o = { ...DEFAULT_OPTS, ...opts };
  const now = Date.now();

  const entry = store.get(key) ?? { failures: [], lockedUntil: null };
  entry.failures = entry.failures.filter((t) => now - t < o.windowMs);
  entry.failures.push(now);

  if (entry.failures.length >= o.maxFailures) {
    entry.lockedUntil = now + o.lockMs;
    store.set(key, entry);
    return {
      ok: false,
      retryAfterSec: Math.ceil(o.lockMs / 1000),
    };
  }

  store.set(key, entry);
  return {
    ok: true,
    remaining: Math.max(0, o.maxFailures - entry.failures.length),
  };
}

/**
 * Clear any recorded state for `key` — call on successful login so a
 * legitimate user who mistyped a few times doesn't stay counted.
 */
export function clearKey(key: string): void {
  store.delete(key);
}
