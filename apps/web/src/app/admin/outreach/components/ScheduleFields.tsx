"use client";

import { useEffect, useMemo, useState } from "react";

import {
  avoidCollision,
  formatInZone,
  localTimeZone,
  nextPresetInstant,
  nowInZone,
  US_TIMEZONES,
  WINDOW_PRESETS,
  zonedWallTimeToUtc,
  type UsTimezoneId,
} from "@/lib/timezone";

import styles from "../outreach.module.css";

/** What the parent needs to submit a scheduled send. `null` = the
 *  current inputs don't resolve to a valid future instant yet. */
export type ScheduleResolution = {
  utc: Date;
  tz: UsTimezoneId;
  staggered: boolean;
} | null;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Split an instant into the <input type=date>/<input type=time> value
 *  strings as they read in `tz`. */
function toInputStrings(at: Date, tz: string): { date: string; time: string } {
  const p = nowInZone(tz, at);
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  };
}

/**
 * The scheduling picker: recipient US timezone, best-window presets, a
 * precise recipient-local date/time, and a live dual-time readout so
 * Mike sees both the recipient's moment and his own (Prague) time.
 * Auto-stagger nudges the instant clear of other queued sends.
 *
 * Controlled-ish: manages its own inputs, and reports the resolved UTC
 * instant up via `onResolve` whenever anything changes.
 */
export function ScheduleFields({
  peers,
  initial,
  onResolve,
}: {
  /** Epoch-ms of other scheduled sends, for collision-aware stagger. */
  peers: number[];
  /** Optional seed (used by the reschedule modal). */
  initial?: { utc: Date; tz: UsTimezoneId };
  onResolve: (r: ScheduleResolution) => void;
}) {
  const mikeTz = useMemo(() => localTimeZone(), []);
  const [tz, setTz] = useState<UsTimezoneId>(initial?.tz ?? "America/New_York");
  const seed = useMemo(() => {
    const at =
      initial?.utc ??
      nextPresetInstant(WINDOW_PRESETS[0], initial?.tz ?? "America/New_York");
    return toInputStrings(at, initial?.tz ?? "America/New_York");
  }, [initial]);
  const [dateStr, setDateStr] = useState(seed.date);
  const [timeStr, setTimeStr] = useState(seed.time);
  const [staggerOn, setStaggerOn] = useState(true);
  // Ticks so the "in the past / too far" validity check stays honest
  // while the picker is open, without reading the clock during render.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  // Resolve inputs → UTC (recipient-local wall time in `tz`), apply
  // stagger, and report up. Recomputes on any input change.
  const resolved = useMemo<
    { utc: Date; tz: UsTimezoneId; staggered: boolean; rawUtc: Date } | null
  >(() => {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, mi] = timeStr.split(":").map(Number);
    if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) return null;
    const rawUtc = zonedWallTimeToUtc(
      { year: y, month: mo, day: d, hour: h, minute: mi },
      tz,
    );
    if (Number.isNaN(rawUtc.getTime())) return null;
    const staggeredMs = staggerOn
      ? avoidCollision(rawUtc.getTime(), peers)
      : rawUtc.getTime();
    return {
      utc: new Date(staggeredMs),
      tz,
      staggered: staggeredMs !== rawUtc.getTime(),
      rawUtc,
    };
  }, [dateStr, timeStr, tz, staggerOn, peers]);

  useEffect(() => {
    onResolve(
      resolved
        ? { utc: resolved.utc, tz: resolved.tz, staggered: resolved.staggered }
        : null,
    );
  }, [resolved, onResolve]);

  function applyPreset(presetId: string) {
    const preset = WINDOW_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const at = nextPresetInstant(preset, tz);
    const s = toInputStrings(at, tz);
    setDateStr(s.date);
    setTimeStr(s.time);
  }

  // When the zone changes, keep the same wall-clock numbers (Mike means
  // "10 AM their time" regardless of which their) — no input rewrite.

  const utc = resolved?.utc ?? null;
  const inPast = utc ? utc.getTime() <= nowMs + 60 * 1000 : false;
  const tooFar = utc ? utc.getTime() - nowMs > 30 * 24 * 60 * 60 * 1000 : false;
  const valid = Boolean(utc) && !inPast && !tooFar;

  return (
    <div className={styles.schedule}>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Recipient&rsquo;s time zone</span>
        <select
          className={styles.select}
          value={tz}
          onChange={(e) => setTz(e.target.value as UsTimezoneId)}
        >
          {US_TIMEZONES.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label} ({z.short})
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>Best-window presets</span>
        <div className={styles.presetRow}>
          {WINDOW_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={styles.presetChip}
              onClick={() => applyPreset(p.id)}
              title={p.hint}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.scheduleGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Date (their local)</span>
          <input
            type="date"
            className={styles.input}
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Time (their local)</span>
          <input
            type="time"
            className={styles.input}
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
          />
        </label>
      </div>

      <label className={styles.staggerToggle}>
        <input
          type="checkbox"
          checked={staggerOn}
          onChange={(e) => setStaggerOn(e.target.checked)}
        />
        <span>
          Auto-space around other scheduled sends
          <span className={styles.staggerHint}>
            {" "}
            — nudges the send clear of a simultaneous burst
          </span>
        </span>
      </label>

      {/* Live dual-time readout */}
      {utc && valid ? (
        <div className={styles.readout}>
          <div className={styles.readoutLine}>
            <span className={styles.readoutTag}>Arrives</span>
            <strong>{formatInZone(utc, tz)}</strong>
          </div>
          <div className={styles.readoutLine}>
            <span className={styles.readoutTag}>Your time</span>
            <span className={styles.readoutMuted}>
              {formatInZone(utc, mikeTz)}
            </span>
          </div>
          {resolved?.staggered && (
            <div className={styles.readoutNudge}>
              Nudged a little to avoid a simultaneous send.
            </div>
          )}
        </div>
      ) : (
        <div className={styles.readoutInvalid}>
          {inPast
            ? "That time is in the past — pick a moment at least a minute out."
            : tooFar
              ? "Resend schedules up to 30 days ahead — pick a nearer time."
              : "Pick a date and time."}
        </div>
      )}
    </div>
  );
}
