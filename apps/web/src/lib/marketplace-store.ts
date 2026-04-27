/**
 * localStorage-backed store for marketplace matches. v1 is mock-only,
 * so persistence is per-browser; when real data + Supabase are wired
 * the same `Match` shape can be moved to a `marketplace_matches`
 * table (status enum, FK to brand_id / creator_id) without touching
 * UI call sites — they read/write through this module's API.
 */

const STORAGE_KEY = "gs.marketplace.matches.v1";

export type MatchStatus = "confirmed" | "rejected";

export type Match = {
  id: string;
  brand_id: string;
  creator_id: string;
  status: MatchStatus;
  /** 0–100 resonance recorded at time of match — stays stable if
   *  trait scores ever shift on the entity records. */
  resonance: number;
  notes?: string;
  created_at: string;
};

/**
 * Cached snapshot. useSyncExternalStore requires getSnapshot to return a
 * stable reference until the store changes, so we keep the parsed array
 * here and only swap it out on write or cross-tab storage event.
 */
let cachedSnapshot: Match[] | null = null;

function readFromStorage(): Match[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Match[];
  } catch {
    return [];
  }
}

function safeRead(): Match[] {
  if (cachedSnapshot === null) cachedSnapshot = readFromStorage();
  return cachedSnapshot;
}

function invalidate(): void {
  cachedSnapshot = null;
}

function safeWrite(matches: readonly Match[]): void {
  // Always update the cache first so a re-read inside the same tick
  // (e.g. immediately after upsert) sees the new value.
  cachedSnapshot = matches.slice();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  } catch {
    /* quota / private mode — silently ignore, store stays in-memory */
  }
}

export const STORAGE_EVENT = "gs:marketplace:matches-changed";

function emit(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
}

export function listMatches(): Match[] {
  return safeRead();
}

export function listConfirmed(): Match[] {
  return safeRead().filter((m) => m.status === "confirmed");
}

function newId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertMatch(input: {
  brand_id: string;
  creator_id: string;
  status: MatchStatus;
  resonance: number;
  notes?: string;
}): Match {
  const all = safeRead();
  const existing = all.find(
    (m) => m.brand_id === input.brand_id && m.creator_id === input.creator_id,
  );
  if (existing) {
    existing.status = input.status;
    existing.resonance = input.resonance;
    if (input.notes !== undefined) existing.notes = input.notes;
    safeWrite(all);
    emit();
    return existing;
  }
  const created: Match = {
    id: newId(),
    brand_id: input.brand_id,
    creator_id: input.creator_id,
    status: input.status,
    resonance: input.resonance,
    notes: input.notes,
    created_at: new Date().toISOString(),
  };
  safeWrite([created, ...all]);
  emit();
  return created;
}

export function removeMatch(id: string): void {
  const all = safeRead().filter((m) => m.id !== id);
  safeWrite(all);
  emit();
}

export function clearAll(): void {
  safeWrite([]);
  emit();
}

/** Subscribe to store changes — returns the unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener();
  window.addEventListener(STORAGE_EVENT, handler);
  // cross-tab updates land on the native `storage` event, not our
  // custom one — bridge them so a match in another tab repaints here.
  // Cross-tab writes don't go through safeWrite locally, so we have to
  // invalidate the cache before notifying React.
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      invalidate();
      listener();
    }
  };
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
