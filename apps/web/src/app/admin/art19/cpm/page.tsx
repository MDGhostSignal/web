"use client";

import { useMemo, useState } from "react";

import { PageHeader } from "@/components/admin";

import styles from "./page.module.css";

/**
 * Signal Fidelity CPM Calculator — Jack's "ballpark" tool.
 *
 * Inputs (per Jack's brief 2026-06-15):
 *  1. XQ/RQ Match — values-alignment score 0–100%
 *  2. Industry benchmark CPM — base reference
 *  3. Ad position — pre / mid / post-roll
 *  4. Ad type — Host-read vs. Spot
 *  5. Ad length — seconds
 *
 * Output: a ballpark CPM estimate with a ±15% confidence band.
 *
 * Multipliers below are placeholder defaults — every constant is
 * tunable in one block at the top of the file. When Jack has real
 * data, swap the numbers and the rest of the tool falls in line.
 */

// === Tunable formula constants ===
const MATCH_MULT_AT_0 = 0.7;
const MATCH_MULT_AT_100 = 1.3;
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
  match: number;
  position: AdPosition;
  type: AdType;
  length: number;
}): { estimate: number; lo: number; hi: number; mults: Record<string, number> } {
  const matchMult =
    MATCH_MULT_AT_0 + (opts.match / 100) * (MATCH_MULT_AT_100 - MATCH_MULT_AT_0);
  const positionMult = POSITION_MULT[opts.position];
  const typeMult = TYPE_MULT[opts.type];
  const lengthMult = lengthMultiplier(opts.length);
  const estimate = opts.benchmark * matchMult * positionMult * typeMult * lengthMult;
  return {
    estimate,
    lo: estimate * (1 - CONFIDENCE_BAND),
    hi: estimate * (1 + CONFIDENCE_BAND),
    mults: {
      match: matchMult,
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
  const [match, setMatch] = useState(70);
  const [position, setPosition] = useState<AdPosition>("mid");
  const [type, setType] = useState<AdType>("host");
  const [length, setLength] = useState(30);

  const result = useMemo(
    () => calculateCpm({ benchmark, match, position, type, length }),
    [benchmark, match, position, type, length],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title="Signal Fidelity CPM Calculator"
        subtitle="Ballpark CPM estimator. Dial in the deal characteristics; the panel updates the estimate live. Multipliers are placeholder defaults — refine the constants in page.tsx as the model matures."
      />

      <div className={styles.console}>
        {/* Header bar — small LEDs + the tool name in faux-display type */}
        <div className={styles.consoleBar}>
          <div className={styles.consoleLeds}>
            <span className={`${styles.led} ${styles.ledOn}`} />
            <span className={styles.led} />
            <span className={styles.led} />
          </div>
          <div className={styles.consoleStamp}>
            <span className={styles.consoleStampLabel}>Signal Fidelity</span>
            <span className={styles.consoleStampModel}>CPM-1A · v0.1</span>
          </div>
        </div>

        <div className={styles.consoleBody}>
          {/* ===== Knobs / sliders row ===== */}
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
              label="XQ / RQ Match"
              suffix="%"
              value={match}
              min={0}
              max={100}
              step={1}
              display={`${match}`}
              onChange={setMatch}
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
          </div>

          {/* ===== Hardware-style toggles ===== */}
          <div className={styles.toggleRow}>
            <Segmented<AdPosition>
              label="Position"
              value={position}
              options={[
                { value: "pre", label: "PRE" },
                { value: "mid", label: "MID" },
                { value: "post", label: "POST" },
              ]}
              onChange={setPosition}
            />
            <Segmented<AdType>
              label="Read Type"
              value={type}
              options={[
                { value: "host", label: "HOST" },
                { value: "spot", label: "SPOT" },
              ]}
              onChange={setType}
            />
          </div>

          {/* ===== Output — LED display ===== */}
          <div className={styles.output}>
            <div className={styles.outputLabel}>Estimated CPM</div>
            <div className={styles.outputDisplay}>
              <span className={styles.outputCurrency}>$</span>
              <span className={styles.outputNumber}>
                {result.estimate.toFixed(2)}
              </span>
            </div>
            <div className={styles.outputRange}>
              Range&nbsp;
              <span className={styles.outputRangeValue}>
                {fmtMoney(result.lo)} – {fmtMoney(result.hi)}
              </span>
              <span className={styles.outputBand}>(±15%)</span>
            </div>
          </div>

          {/* ===== Multiplier breakdown — what each dial contributes ===== */}
          <div className={styles.breakdown}>
            <div className={styles.breakdownTitle}>Signal chain</div>
            <BreakdownRow name="Base" value={fmtMoney(benchmark)} />
            <BreakdownRow name="Match" value={fmtMult(result.mults.match)} />
            <BreakdownRow name="Position" value={fmtMult(result.mults.position)} />
            <BreakdownRow name="Type" value={fmtMult(result.mults.type)} />
            <BreakdownRow name="Length" value={fmtMult(result.mults.length)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// === Small sub-components ===

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
    <div className={styles.segmented}>
      <div className={styles.segmentedLabel}>{label}</div>
      <div className={styles.segmentedGroup} role="radiogroup" aria-label={label}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              className={`${styles.segmentedBtn} ${active ? styles.segmentedBtnActive : ""}`}
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
