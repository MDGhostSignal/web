/**
 * Timezone helpers for scheduled cold outreach.
 *
 * The whole feature turns on one operation: Mike thinks in the
 * recipient's *local* time ("hit their 10 AM"), but Resend + our DB
 * need an absolute UTC instant. These helpers convert a wall-clock time
 * in a given IANA zone → the correct UTC `Date`, DST included, using
 * only the built-in `Intl` API (no dependency).
 *
 * Pure + isomorphic — imported by the composer (client, for the live
 * readout) and the API route (server, to re-derive/validate the UTC).
 */

/** The US zones a cold-outreach recipient realistically sits in. Order
 *  = east → west, which is how Mike scans them. */
export const US_TIMEZONES = [
  { id: "America/New_York", label: "Eastern", short: "ET" },
  { id: "America/Chicago", label: "Central", short: "CT" },
  { id: "America/Denver", label: "Mountain", short: "MT" },
  { id: "America/Los_Angeles", label: "Pacific", short: "PT" },
] as const;

export type UsTimezoneId = (typeof US_TIMEZONES)[number]["id"];

export function isUsTimezone(tz: string): tz is UsTimezoneId {
  return US_TIMEZONES.some((z) => z.id === tz);
}

/** Wall-clock components, all numbers 1-based where humans expect
 *  (month 1-12, day 1-31). `weekday` is 0=Sun … 6=Sat. */
export type WallTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const PART_FMT_CACHE = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = PART_FMT_CACHE.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    PART_FMT_CACHE.set(timeZone, fmt);
  }
  return fmt;
}

/** The offset (ms) that `timeZone` is ahead of UTC at the given
 *  instant. `zone_local = utc + offset`. */
function zoneOffsetMs(timeZone: string, at: Date): number {
  const parts = partsFormatter(timeZone).formatToParts(at);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - at.getTime();
}

/**
 * Convert a wall-clock time *in `timeZone`* to the absolute UTC instant.
 *
 * Two-pass so it stays correct across DST transitions: guess by
 * treating the wall time as if it were UTC, measure the zone's offset
 * at that guess, correct, then re-measure once (the correction can
 * itself cross a DST boundary). Ambiguous/nonexistent hours during the
 * fall-back / spring-forward hour resolve deterministically — fine for
 * scheduling a send window.
 */
export function zonedWallTimeToUtc(w: WallTime, timeZone: string): Date {
  const naive = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  let offset = zoneOffsetMs(timeZone, new Date(naive));
  let utc = naive - offset;
  // Second pass: re-measure at the corrected instant.
  const offset2 = zoneOffsetMs(timeZone, new Date(utc));
  if (offset2 !== offset) {
    offset = offset2;
    utc = naive - offset;
  }
  return new Date(utc);
}

/** Current wall-clock time in a zone, plus weekday. */
export function nowInZone(timeZone: string, now: Date = new Date()): WallTime & {
  weekday: number;
} {
  const parts = partsFormatter(timeZone).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    year,
    month,
    day,
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday,
  };
}

/** Format an instant as it reads in a zone, e.g.
 *  "Tue, Aug 25, 10:00 AM EDT". */
export function formatInZone(
  at: Date,
  timeZone: string,
  opts: { weekday?: boolean; tzName?: boolean } = {},
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: opts.weekday === false ? undefined : "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: opts.tzName === false ? undefined : "short",
  }).format(at);
}

/** The viewer's own IANA zone (Mike's, in the browser). Server falls
 *  back to UTC. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * "Best email-opening window" presets. Cold-open wisdom: mid-morning,
 * mid-week. Each computes the *next* matching instant at or after
 * `from` in the recipient's zone. `days` is 0=Sun … 6=Sat; empty = any
 * day. Mike can always fine-tune the resulting date/time by hand.
 */
export type WindowPreset = {
  id: string;
  label: string;
  hint: string;
  hour: number;
  minute: number;
  days: number[];
};

export const WINDOW_PRESETS: WindowPreset[] = [
  {
    id: "midweek-10",
    label: "Tue–Thu, 10:00 AM",
    hint: "Classic cold-open window",
    hour: 10,
    minute: 0,
    days: [2, 3, 4],
  },
  {
    id: "weekday-8",
    label: "Weekday, 8:00 AM",
    hint: "Top of the inbox at start of day",
    hour: 8,
    minute: 0,
    days: [1, 2, 3, 4, 5],
  },
  {
    id: "weekday-1pm",
    label: "Weekday, 1:00 PM",
    hint: "Post-lunch catch-up",
    hour: 13,
    minute: 0,
    days: [1, 2, 3, 4, 5],
  },
  {
    id: "tue-thu-2pm",
    label: "Tue/Thu, 2:00 PM",
    hint: "Mid-afternoon, mid-week",
    hour: 14,
    minute: 0,
    days: [2, 4],
  },
];

/**
 * The next UTC instant matching a preset in `timeZone`, at least
 * `minLeadMs` in the future (default 5 min — Resend needs a hair of
 * lead, and it keeps "now-ish" clicks from scheduling in the past).
 */
export function nextPresetInstant(
  preset: WindowPreset,
  timeZone: string,
  from: Date = new Date(),
  minLeadMs = 5 * 60 * 1000,
): Date {
  const floor = from.getTime() + minLeadMs;
  const base = nowInZone(timeZone, from);
  for (let offset = 0; offset < 21; offset++) {
    const cal = new Date(Date.UTC(base.year, base.month - 1, base.day + offset));
    const weekday = cal.getUTCDay();
    if (preset.days.length && !preset.days.includes(weekday)) continue;
    const candidate = zonedWallTimeToUtc(
      {
        year: cal.getUTCFullYear(),
        month: cal.getUTCMonth() + 1,
        day: cal.getUTCDate(),
        hour: preset.hour,
        minute: preset.minute,
      },
      timeZone,
    );
    if (candidate.getTime() >= floor) return candidate;
  }
  // Fallback (shouldn't hit): 24h out.
  return new Date(floor + 24 * 60 * 60 * 1000);
}

/**
 * Auto-stagger: nudge `desired` forward until it's at least `gapMs`
 * from every peer send, so a batch lined up around the same window
 * doesn't fire a burst of identical-second sends (a spam signal on cold
 * mail). Walks forward in `gapMs` steps from the first colliding peer,
 * which keeps a run of same-window sends neatly spaced. Returns the
 * original instant when nothing is nearby.
 */
export function avoidCollision(
  desiredMs: number,
  peersMs: number[],
  gapMs = 90 * 1000,
): number {
  if (!peersMs.length) return desiredMs;
  const sorted = [...peersMs].sort((a, b) => a - b);
  let candidate = desiredMs;
  let moved = true;
  // Re-scan until a full pass finds no peer within the gap (a nudge can
  // push us next to a later peer).
  while (moved) {
    moved = false;
    for (const peer of sorted) {
      if (Math.abs(candidate - peer) < gapMs) {
        candidate = peer + gapMs;
        moved = true;
      }
    }
  }
  return candidate;
}
