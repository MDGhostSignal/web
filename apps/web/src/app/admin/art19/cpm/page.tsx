"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/admin";

import styles from "./page.module.css";

/**
 * Signal Fidelity CPM Calculator — Jack's "ballpark" tool.
 *
 * Inputs (per Jack's brief 2026-06-15, XQ/RQ match removed 2026-07-20):
 *  1. Industry benchmark CPM — base reference
 *  2. Ad position — pre / mid / post-roll
 *  3. Ad type — Host-read vs. Spot
 *  4. Ad length — seconds
 *
 * Output: a ballpark CPM estimate with a ±15% confidence band.
 *
 * Multipliers below are placeholder defaults — every constant is
 * tunable in one block at the top of the file. When Jack has real
 * data, swap the numbers and the rest of the tool falls in line.
 */

// === Tunable formula constants ===
const POSITION_MULT = { pre: 0.85, mid: 1.0, post: 0.65 } as const;
const TYPE_MULT = { host: 1.3, spot: 0.85 } as const;
/** Piecewise length curve. Linearly interpolated between points. */
const LENGTH_CURVE: Array<[seconds: number, mult: number]> = [
  [15, 0.7],
  [30, 1.0],
  [60, 1.5],
  [90, 1.8],
];
const CONFIDENCE_BAND = 0.15;

type AdPosition = keyof typeof POSITION_MULT;
type AdType = keyof typeof TYPE_MULT;

function lengthMultiplier(seconds: number): number {
  if (seconds <= LENGTH_CURVE[0][0]) return LENGTH_CURVE[0][1];
  if (seconds >= LENGTH_CURVE[LENGTH_CURVE.length - 1][0]) {
    return LENGTH_CURVE[LENGTH_CURVE.length - 1][1];
  }
  for (let i = 0; i < LENGTH_CURVE.length - 1; i++) {
    const [a, av] = LENGTH_CURVE[i];
    const [b, bv] = LENGTH_CURVE[i + 1];
    if (seconds >= a && seconds <= b) {
      return av + ((seconds - a) / (b - a)) * (bv - av);
    }
  }
  return 1.0;
}

function calculateCpm(opts: {
  benchmark: number;
  position: AdPosition;
  type: AdType;
  length: number;
}): { estimate: number; lo: number; hi: number; mults: Record<string, number> } {
  const positionMult = POSITION_MULT[opts.position];
  const typeMult = TYPE_MULT[opts.type];
  const lengthMult = lengthMultiplier(opts.length);
  const estimate = opts.benchmark * positionMult * typeMult * lengthMult;
  return {
    estimate,
    lo: estimate * (1 - CONFIDENCE_BAND),
    hi: estimate * (1 + CONFIDENCE_BAND),
    mults: {
      position: positionMult,
      type: typeMult,
      length: lengthMult,
    },
  };
}

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const fmtMult = (n: number) => `× ${n.toFixed(2)}`;

export default function CpmCalculatorPage() {
  const [benchmark, setBenchmark] = useState(25);
  const [position, setPosition] = useState<AdPosition>("mid");
  const [type, setType] = useState<AdType>("host");
  const [length, setLength] = useState(30);

  const result = useMemo(
    () => calculateCpm({ benchmark, position, type, length }),
    [benchmark, position, type, length],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Signal Fidelity CPM Calculator"
        subtitle="Ballpark CPM estimator. Dial in the deal characteristics; the estimate updates live. Multipliers are placeholder defaults — refine the constants in page.tsx as the model matures."
      />

      <div className={styles.controls}>
        <Slider
          label="Industry Benchmark"
          unit="$"
          suffix="CPM"
          value={benchmark}
          min={5}
          max={150}
          step={1}
          display={`${benchmark}`}
          onChange={setBenchmark}
        />
        <Slider
          label="Ad Length"
          suffix="s"
          value={length}
          min={10}
          max={120}
          step={5}
          display={`${length}`}
          onChange={setLength}
        />
        <Segmented<AdPosition>
          label="Position"
          value={position}
          options={[
            { value: "pre", label: "Pre" },
            { value: "mid", label: "Mid" },
            { value: "post", label: "Post" },
          ]}
          onChange={setPosition}
        />
        <Segmented<AdType>
          label="Read Type"
          value={type}
          options={[
            { value: "host", label: "Host-read" },
            { value: "spot", label: "Spot" },
          ]}
          onChange={setType}
        />
      </div>

      <div className={styles.resultRow}>
        <div className={styles.output}>
          <span className={styles.outputLabel}>Estimated CPM</span>
          <span className={styles.outputValue}>{fmtMoney(result.estimate)}</span>
          <span className={styles.outputHint}>
            Range {fmtMoney(result.lo)} – {fmtMoney(result.hi)} (±15%)
          </span>
        </div>

        <div className={styles.breakdown}>
          <div className={styles.breakdownTitle}>Signal chain</div>
          <BreakdownRow name="Base" value={fmtMoney(benchmark)} />
          <BreakdownRow name="Position" value={fmtMult(result.mults.position)} />
          <BreakdownRow name="Type" value={fmtMult(result.mults.type)} />
          <BreakdownRow name="Length" value={fmtMult(result.mults.length)} />
        </div>
      </div>

      <HowItWorks />
    </div>
  );
}

// === Small sub-components ===

/**
 * Expandable how-to panel for first-time users (written for Mike).
 * Multiplier tables render from the formula constants above, so
 * tuning the constants updates this documentation automatically.
 */
function HowItWorks() {
  const positionRows: Array<[string, number]> = [
    ["Pre-roll", POSITION_MULT.pre],
    ["Mid-roll", POSITION_MULT.mid],
    ["Post-roll", POSITION_MULT.post],
  ];
  const typeRows: Array<[string, number]> = [
    ["Host-read", TYPE_MULT.host],
    ["Spot", TYPE_MULT.spot],
  ];

  return (
    <details className={styles.help}>
      <summary className={styles.helpSummary}>
        <span className={styles.helpIcon} aria-hidden="true">
          ?
        </span>
        How this calculator works
        <span className={styles.helpChevron} aria-hidden="true">
          ▾
        </span>
      </summary>

      <div className={styles.helpBody}>
        <p>
          This tool produces a <strong>ballpark CPM</strong> (cost per 1,000
          impressions) for a podcast ad deal. It is an estimating aid for
          quick conversations — not a rate card and not a quote.
        </p>

        <h4 className={styles.helpHeading}>Using it</h4>
        <ol className={styles.helpList}>
          <li>
            Set the <strong>Industry Benchmark</strong> slider to the going
            CPM for comparable shows in the genre — this is the starting
            number everything else adjusts.
          </li>
          <li>
            Set the <strong>Ad Length</strong> slider to the spot duration in
            seconds.
          </li>
          <li>
            Pick the <strong>Position</strong> (where the ad sits in the
            episode) and the <strong>Read Type</strong> (host-read vs. a
            produced spot).
          </li>
          <li>
            Read the result — the big amber number is the estimate, and the
            range below it is a ±{Math.round(CONFIDENCE_BAND * 100)}%
            confidence band. Quote the range, not the single number.
          </li>
        </ol>

        <h4 className={styles.helpHeading}>The math</h4>
        <p>
          The benchmark is multiplied by three factors. The{" "}
          <strong>Signal chain</strong> card shows each factor for the
          current settings, so you can see exactly why the estimate is what
          it is.
        </p>
        <div className={styles.helpTables}>
          <table className={styles.helpTable}>
            <caption className={styles.helpTableCaption}>Position</caption>
            <tbody>
              {positionRows.map(([name, mult]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td className={styles.helpTableValue}>{fmtMult(mult)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className={styles.helpTable}>
            <caption className={styles.helpTableCaption}>Read type</caption>
            <tbody>
              {typeRows.map(([name, mult]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td className={styles.helpTableValue}>{fmtMult(mult)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className={styles.helpTable}>
            <caption className={styles.helpTableCaption}>
              Length (interpolated between)
            </caption>
            <tbody>
              {LENGTH_CURVE.map(([seconds, mult]) => (
                <tr key={seconds}>
                  <td>{seconds}s</td>
                  <td className={styles.helpTableValue}>{fmtMult(mult)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Example: a $25 benchmark, mid-roll, host-read, 30s →{" "}
          <span className={styles.helpMono}>
            $25 × {POSITION_MULT.mid.toFixed(2)} × {TYPE_MULT.host.toFixed(2)}{" "}
            × 1.00 = {fmtMoney(25 * POSITION_MULT.mid * TYPE_MULT.host)}
          </span>
          .
        </p>

        <p className={styles.helpCaveat}>
          The multiplier values are placeholder defaults until we calibrate
          them against real campaign data — treat estimates as
          conversation-starters, and sanity-check against recent comparable
          deals in the ART19 Campaigns dashboard.
        </p>
      </div>
    </details>
  );
}

function Slider({
  label,
  unit,
  suffix,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  unit?: string;
  suffix?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className={styles.control}>
      <div className={styles.controlHead}>
        <span className={styles.controlLabel}>{label}</span>
        <span className={styles.controlReadout}>
          {unit ? <span className={styles.controlUnit}>{unit}</span> : null}
          {display}
          {suffix ? <span className={styles.controlSuffix}>{suffix}</span> : null}
        </span>
      </div>
      <input
        type="range"
        className={styles.slider}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className={styles.control}>
      <div className={styles.controlHead}>
        <span className={styles.controlLabel}>{label}</span>
      </div>
      <div className={styles.chipGroup} role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${styles.chip} ${active ? styles.chipActive : ""}`}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BreakdownRow({ name, value }: { name: string; value: string }) {
  return (
    <div className={styles.breakdownRow}>
      <span className={styles.breakdownName}>{name}</span>
      <span className={styles.breakdownValue}>{value}</span>
    </div>
  );
}
