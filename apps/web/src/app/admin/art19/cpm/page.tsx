"use client";

import { useMemo, useState } from "react";

import { Modal, PageHeader } from "@/components/admin";
import { IconHelp } from "@/components/admin/icons";

import styles from "./page.module.css";

/**
 * Rate & Revenue Calculator — Jack's direct-ad-sales 70/30 desk.
 *
 * Brand budget is split 70% creator / 30% GhostSignal. Position, length,
 * and creative type only change Gross CPM (and therefore how many
 * impressions the same budget buys). Constants are the rate card —
 * change them here and the UI labels follow.
 *
 * Replaces the earlier Signal Fidelity ballpark (benchmark × multipliers
 * ±15%). Same route: /admin/art19/cpm.
 */

const CREATOR_SHARE = 0.7;
const PLATFORM_SHARE = 0.3;

const POSITION = {
  pre: { label: "Pre-roll", cpm: 25 },
  mid: { label: "Mid-roll", cpm: 35 },
  post: { label: "Post-roll", cpm: 20 },
} as const;

const LENGTH = {
  "30": { label: "30 seconds", mult: 1.0 },
  "60": { label: "60 seconds", mult: 1.2 },
} as const;

const CREATIVE = {
  host: { label: "Host-read", mult: 1.3 },
  producer: { label: "Producer spot", mult: 1.0 },
} as const;

type Position = keyof typeof POSITION;
type Length = keyof typeof LENGTH;
type Creative = keyof typeof CREATIVE;

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const fmtCount = (n: number) => Math.round(n).toLocaleString("en-US");

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function CpmCalculatorPage() {
  const [budget, setBudget] = useState(1500);
  const [position, setPosition] = useState<Position>("mid");
  const [length, setLength] = useState<Length>("30");
  const [creative, setCreative] = useState<Creative>("host");
  const [helpOpen, setHelpOpen] = useState(false);

  const result = useMemo(() => {
    const grossCpm =
      POSITION[position].cpm * LENGTH[length].mult * CREATIVE[creative].mult;
    const impressions = grossCpm > 0 ? (budget / grossCpm) * 1000 : 0;
    return {
      grossCpm,
      impressions,
      creatorPayout: budget * CREATOR_SHARE,
      netRpm: grossCpm * CREATOR_SHARE,
      platformProfit: budget * PLATFORM_SHARE,
      platformSpread: grossCpm * PLATFORM_SHARE,
    };
  }, [budget, position, length, creative]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Rate & Revenue Calculator"
        subtitle="Direct ad sales · 70/30 split"
        count={
          <button
            type="button"
            className={styles.infoButton}
            onClick={() => setHelpOpen(true)}
            aria-label="How this calculator works"
            title="How this works"
          >
            <IconHelp className={styles.infoIcon} />
          </button>
        }
      />

      <div className={styles.workspace}>
        <aside className={styles.controls}>
          <label className={styles.control}>
            <span className={styles.controlLabel}>Campaign budget</span>
            <span className={styles.budgetField}>
              <span className={styles.budgetPrefix} aria-hidden="true">
                $
              </span>
              <input
                type="number"
                min={0}
                step={50}
                className={styles.budgetInput}
                value={Number.isFinite(budget) ? budget : 0}
                onChange={(e) => setBudget(Number(e.target.value) || 0)}
              />
            </span>
          </label>

          <Segmented<Position>
            label="Ad position"
            value={position}
            options={(Object.keys(POSITION) as Position[]).map((key) => ({
              value: key,
              label: `${POSITION[key].label} · $${POSITION[key].cpm}`,
            }))}
            onChange={setPosition}
          />
          <Segmented<Length>
            label="Ad length"
            value={length}
            options={(Object.keys(LENGTH) as Length[]).map((key) => ({
              value: key,
              label: `${LENGTH[key].label}${LENGTH[key].mult === 1 ? "" : ` · +${Math.round((LENGTH[key].mult - 1) * 100)}%`}`,
            }))}
            onChange={setLength}
          />
          <Segmented<Creative>
            label="Creative type"
            value={creative}
            options={(Object.keys(CREATIVE) as Creative[]).map((key) => ({
              value: key,
              label: `${CREATIVE[key].label}${CREATIVE[key].mult === 1 ? "" : ` · +${Math.round((CREATIVE[key].mult - 1) * 100)}%`}`,
            }))}
            onChange={setCreative}
          />
        </aside>

        <div className={styles.dashboard}>
          <article className={styles.column}>
            <h2 className={styles.columnTitle}>Brand cost</h2>
            <Metric label="Gross CPM" value={fmtMoney(result.grossCpm)} />
            <Metric
              label="Total impressions"
              value={fmtCount(result.impressions)}
            />
          </article>

          <article className={styles.column}>
            <h2 className={styles.columnTitle}>Creator payout</h2>
            <Metric
              label={`Net RPM (${pct(CREATOR_SHARE)})`}
              value={fmtMoney(result.netRpm)}
              accent
            />
            <Metric
              label="Total creator payout"
              value={fmtMoney(result.creatorPayout)}
              accent
            />
          </article>

          <article className={styles.column}>
            <h2 className={styles.columnTitle}>GhostSignal</h2>
            <Metric
              label={`Platform spread (${pct(PLATFORM_SHARE)})`}
              value={fmtMoney(result.platformSpread)}
            />
            <Metric
              label="Total GS profit"
              value={fmtMoney(result.platformProfit)}
            />
          </article>

          <p className={styles.footerNote}>
            Matching, data, and routing are included in the Gross CPM. No
            extra fee on top.
          </p>
        </div>
      </div>

      {helpOpen && (
        <Modal
          open
          onClose={() => setHelpOpen(false)}
          title="How this works"
          subtitle="The whole calculator in plain language."
          size="sm"
        >
          <p>
            The brand sets a <strong>budget</strong> — that is all the money
            in the deal.
          </p>
          <p>
            We split that money the same way every time: the creator gets{" "}
            <strong>{pct(CREATOR_SHARE)}</strong>, GhostSignal keeps{" "}
            <strong>{pct(PLATFORM_SHARE)}</strong>.
          </p>
          <p>
            Where the ad sits, how long it is, and who reads it only change
            the <strong>CPM</strong> — the price for every 1,000 listens. A
            higher CPM means the same budget buys fewer listens. A lower CPM
            buys more.
          </p>
          <p>
            Right now, with these settings, the brand pays{" "}
            <strong>{fmtMoney(budget)}</strong> and gets about{" "}
            <strong>{fmtCount(result.impressions)}</strong> listens. The
            creator takes <strong>{fmtMoney(result.creatorPayout)}</strong>.
            GhostSignal takes <strong>{fmtMoney(result.platformProfit)}</strong>.
          </p>
        </Modal>
      )}
    </div>
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
      <span className={styles.controlLabel}>{label}</span>
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

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div
        className={`${styles.metricValue} ${accent ? styles.metricAccent : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
