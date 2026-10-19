import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

export type GoalRow = {
  id: string;
  title: string;
  note: string;
  horizon: "short" | "mid" | "long";
  cadence: "week" | "month" | "year";
  status: "on_track" | "watch" | "done" | "parked";
  parent_id: string | null;
  sort_order: number;
  owner: string;
  updated_at: string;
};

const HORIZONS = new Set(["short", "mid", "long"]);
const CADENCES = new Set(["week", "month", "year"]);
const STATUSES = new Set(["on_track", "watch", "done", "parked"]);

export function isMissingTable(detail: string): boolean {
  return (
    detail.includes("42P01") ||
    detail.includes("PGRST205") ||
    detail.includes("does not exist") ||
    detail.includes("Could not find the table") ||
    detail.includes("schema cache")
  );
}

export function missingTableResponse() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Horizon storage isn't set up yet — run docs/HORIZON_SUPABASE_SCHEMA.sql.",
    },
    { status: 503 },
  );
}

export function asText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function asEnum<T extends string>(
  value: unknown,
  allowed: Set<string>,
): T | null {
  return typeof value === "string" && allowed.has(value) ? (value as T) : null;
}

export { HORIZONS, CADENCES, STATUSES };

export async function loadGoals() {
  return supabaseRest<GoalRow[]>(
    "company_goals?select=id,title,note,horizon,cadence,status,parent_id,sort_order,owner,updated_at&order=sort_order.asc",
  );
}
