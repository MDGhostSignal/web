"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { parseAmountCents } from "@/lib/mercury-types";

type Props = {
  /** 7-day-ish series of per-account balances. Last entry = today. */
  series: ReadonlyArray<{ date: string; balance: string }>;
  /** Trend tint — derived from start-vs-end delta by the parent. */
  positive: boolean;
};

/**
 * Compact 7-day balance sparkline for AccountCard. No axes, no
 * tooltip, no grid — just the silhouette of the trend. Recharts
 * gives us a clean responsive container for the same animation +
 * theming primitives as the main CashTrendChart.
 */
export function AccountSparkline({ series, positive }: Props) {
  const data = useMemo(
    () =>
      series.map((p) => ({
        date: p.date,
        balance: Number(parseAmountCents(p.balance)) / 10000,
      })),
    [series],
  );

  if (data.length < 2) return null;

  const color = positive ? "var(--admin-success)" : "var(--admin-text-muted)";

  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="balance"
          stroke={color}
          strokeWidth={1.5}
          fill="url(#sparkFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
