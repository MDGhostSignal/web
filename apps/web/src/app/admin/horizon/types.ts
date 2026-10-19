export type Horizon = "short" | "mid" | "long";
export type Cadence = "week" | "month" | "year";
export type GoalStatus = "on_track" | "watch" | "done" | "parked";

export type Goal = {
  id: string;
  title: string;
  note: string;
  horizon: Horizon;
  cadence: Cadence;
  status: GoalStatus;
  parent_id: string | null;
  sort_order: number;
  owner: string;
  updated_at: string;
};

export const HORIZON_META: Record<
  Horizon,
  { label: string; hint: string }
> = {
  short: { label: "Short term", hint: "This week and this month" },
  mid: { label: "Midterm", hint: "This quarter and this year" },
  long: { label: "Long term", hint: "The direction everything else serves" },
};

export const CADENCE_LABEL: Record<Cadence, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
};

export const STATUS_LABEL: Record<GoalStatus, string> = {
  on_track: "On track",
  watch: "Watch",
  done: "Done",
  parked: "Parked",
};
