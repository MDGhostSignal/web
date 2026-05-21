"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatCents,
  parseAmountCents,
} from "@/lib/mercury-types";

import styles from "../finance.module.css";

export type CashTrendPoint = {
  date: string; // YYYY-MM-DD
  totalBalance: string; // "1234.5678"
};

type Props = {
  points: CashTrendPoint[];
  currency: string;
};

type ChartPoint = {
  date: string;
  display: string; // "May 21" shown on axis
  cents: number; // already-scaled by Recharts but only for axis tick math
  balance: number; // bigint cents converted *only* for chart drawing
  balanceLabel: string; // pre-formatted for the tooltip
};

/**
 * 90-day cash-position trend, single-area chart. Server-aggregated
 * points come in pre-computed; the component only translates them
 * for Recharts and themes the visuals against the --admin-* tokens.
 *
 * Bigint cents are converted to `number` ONLY for the chart drawing —
 * the formatted label (used in tooltip + Y-axis ticks) goes through
 * formatCents which stays in bigint land. Drawing precision is fine
 * with floats at this scale.
 */
export function CashTrendChart({ points, currency }: Props) {
  const data: ChartPoint[] = useMemo(() => {
    return points.map((p) => {
      const cents = parseAmountCents(p.totalBalance);
      // For drawing only — Recharts needs a JS number. The label that
      // the user sees is rendered through formatCents (bigint-safe).
      const balance = Number(cents) / 10000;
      return {
        date: p.date,
        display: formatTickDate(p.date),
        cents: Number(cents),
        balance,
        balanceLabel: formatCents(cents, currency),
      };
    });
  }, [points, currency]);

  if (data.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        Not enough cached transactions to draw a trend yet.
      </div>
    );
  }

  return (
    <div className={styles.chartFrame}>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart
          data={data}
          margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--admin-accent)"
                stopOpacity={0.32}
              />
              <stop
                offset="100%"
                stopColor="var(--admin-accent)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>

          <CartesianGrid
            stroke="var(--admin-border)"
            strokeDasharray="3 4"
            vertical={false}
          />

          <XAxis
            dataKey="display"
            stroke="var(--admin-text-muted)"
            tick={{ fill: "var(--admin-text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />

          <YAxis
            stroke="var(--admin-text-muted)"
            tick={{ fill: "var(--admin-text-muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={72}
            tickFormatter={(v: number) =>
              formatCompactCurrency(v, currency)
            }
          />

          <Tooltip
            cursor={{ stroke: "var(--admin-border-strong)" }}
            contentStyle={{
              background: "var(--admin-bg-elevated)",
              border: "1px solid var(--admin-border-strong)",
              borderRadius: 8,
              color: "var(--admin-text-primary)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--admin-text-muted)" }}
            formatter={(_value, _name, item) => {
              const point = (item as { payload?: ChartPoint })?.payload;
              return [point?.balanceLabel ?? "—", "Total cash"];
            }}
            labelFormatter={(label) => String(label ?? "")}
          />

          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--admin-accent)"
            strokeWidth={2}
            fill="url(#cashFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --- Helpers ---------------------------------------------------------- */

function formatTickDate(isoDate: string): string {
  // isoDate is YYYY-MM-DD. Render "May 21" — short for axis ticks.
  const [, m, d] = isoDate.split("-");
  if (!m || !d) return isoDate;
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const idx = Number.parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return isoDate;
  return `${monthNames[idx]} ${Number.parseInt(d, 10)}`;
}

function formatCompactCurrency(value: number, currency: string): string {
  // For axis ticks: "$1.2M", "$340K", "$8.5K". Compact, scannable.
  const sym = currencyMark(currency);
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${sym}${(value / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sym}${(value / 1_000).toFixed(1)}K`;
  }
  return `${sym}${value.toFixed(0)}`;
}

function currencyMark(currency: string): string {
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  if (currency === "GBP") return "£";
  return `${currency} `;
}
