/**
 * Shared date math for the Social Media Scheduler calendar views
 * (Day / Week / Month / Year). Kept local to the social feature for now
 * — promote to a wider utility only when a second consumer appears.
 *
 * All boundaries are local-time (mirrors what the UI shows the user).
 * "End" boundaries are EXCLUSIVE — i.e. endOfWeek(today) is the Monday
 * of next week, not Sunday 23:59. Half-open ranges compose cleanly with
 * `>= start && < end` and avoid the off-by-one trap.
 */

export type CalendarView = "day" | "week" | "month" | "year";

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Monday 00:00 of the week containing `d` (local time). */
export function startOfWeek(d: Date): Date {
  const out = startOfDay(d);
  const dow = out.getDay(); // 0 = Sun … 6 = Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  out.setDate(out.getDate() + diff);
  return out;
}

export function startOfMonth(d: Date): Date {
  const out = new Date(d);
  out.setDate(1);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function startOfYear(d: Date): Date {
  const out = new Date(d);
  out.setMonth(0, 1);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function endOfDay(d: Date): Date {
  const out = startOfDay(d);
  out.setDate(out.getDate() + 1);
  return out;
}

export function endOfWeek(d: Date): Date {
  const out = startOfWeek(d);
  out.setDate(out.getDate() + 7);
  return out;
}

export function endOfMonth(d: Date): Date {
  const out = startOfMonth(d);
  out.setMonth(out.getMonth() + 1);
  return out;
}

export function endOfYear(d: Date): Date {
  const out = startOfYear(d);
  out.setFullYear(out.getFullYear() + 1);
  return out;
}

/** `YYYY-MM-DD` local-date key — stable bucket id for any view. */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function rangeForView(
  view: CalendarView,
  anchor: Date,
): { start: Date; end: Date } {
  switch (view) {
    case "day":
      return { start: startOfDay(anchor), end: endOfDay(anchor) };
    case "week":
      return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
    case "month":
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
    case "year":
      return { start: startOfYear(anchor), end: endOfYear(anchor) };
  }
}

/**
 * Fetch window for a given view. Wider than `rangeForView` so the user
 * can scrub one step without triggering a refetch — week → ±1 week,
 * month → ±1 month, etc. Year is the natural width with no padding.
 */
export function fetchRangeForView(
  view: CalendarView,
  anchor: Date,
): { start: Date; end: Date } {
  switch (view) {
    case "day": {
      const start = startOfDay(anchor);
      start.setDate(start.getDate() - 1);
      const end = endOfDay(anchor);
      end.setDate(end.getDate() + 1);
      return { start, end };
    }
    case "week": {
      const start = startOfWeek(anchor);
      start.setDate(start.getDate() - 7);
      const end = endOfWeek(anchor);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }
    case "month": {
      const start = startOfMonth(anchor);
      start.setMonth(start.getMonth() - 1);
      const end = endOfMonth(anchor);
      end.setMonth(end.getMonth() + 1);
      return { start, end };
    }
    case "year":
      return rangeForView("year", anchor);
  }
}

export function stepAnchor(
  view: CalendarView,
  anchor: Date,
  direction: 1 | -1,
): Date {
  const out = new Date(anchor);
  switch (view) {
    case "day":
      out.setDate(out.getDate() + direction);
      break;
    case "week":
      out.setDate(out.getDate() + 7 * direction);
      break;
    case "month":
      out.setMonth(out.getMonth() + direction);
      break;
    case "year":
      out.setFullYear(out.getFullYear() + direction);
      break;
  }
  return out;
}

export function formatRangeLabel(view: CalendarView, anchor: Date): string {
  switch (view) {
    case "day":
      return startOfDay(anchor).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    case "week": {
      const start = startOfWeek(anchor);
      const inclusiveEnd = new Date(start);
      inclusiveEnd.setDate(inclusiveEnd.getDate() + 6);
      const sameMonth =
        start.getMonth() === inclusiveEnd.getMonth() &&
        start.getFullYear() === inclusiveEnd.getFullYear();
      if (sameMonth) {
        return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${inclusiveEnd.getDate()}, ${inclusiveEnd.getFullYear()}`;
      }
      const startStr = start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const endStr = inclusiveEnd.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${startStr} — ${endStr}`;
    }
    case "month":
      return startOfMonth(anchor).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    case "year":
      return String(anchor.getFullYear());
  }
}
