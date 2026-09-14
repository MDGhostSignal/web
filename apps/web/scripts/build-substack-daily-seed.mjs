import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");

const emailsPath =
  process.argv[2] ||
  "C:/Users/heyma/Downloads/snowdriftghostsignal_emails_2026-09-14.csv";
const trafficPath =
  process.argv[3] ||
  "C:/Users/heyma/Downloads/snowdriftghostsignal_traffic_2026-09-14.csv";

const emails = fs
  .readFileSync(emailsPath, "utf8")
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => {
    const [d, c] = l.split(",");
    return [d.replace(/\//g, "-"), Number(c)];
  });

const traffic = fs
  .readFileSync(trafficPath, "utf8")
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .filter(Boolean)
  .map((l) => {
    const [d, c] = l.split(",");
    return [d.replace(/\//g, "-"), Number(c)];
  });

const subMap = new Map(emails);
const viewMap = new Map(traffic);
const days = [...new Set([...subMap.keys(), ...viewMap.keys()])].sort();

let lastSub = 0;
const rows = [];
for (const day of days) {
  if (subMap.has(day)) lastSub = subMap.get(day);
  rows.push({
    day,
    subscriber_count: lastSub,
    views: viewMap.get(day) ?? 0,
  });
}

const values = rows
  .map((r) => `('${r.day}', ${r.subscriber_count}, ${r.views})`)
  .join(",\n  ");

const sql = `-- Substack daily series for the Dashboard analytics tile.
-- Source: Substack CSV exports (emails = cumulative subscribers,
-- traffic = daily views). Idempotent upsert.
--
-- Run in the Supabase SQL editor (with docs/SUBSTACK_METRICS_SCHEMA.sql
-- if you still want the legacy snapshot table for notes).

create table if not exists public.substack_daily (
  day date primary key,
  subscriber_count bigint not null check (subscriber_count >= 0),
  views bigint not null default 0 check (views >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists substack_daily_day_idx
  on public.substack_daily (day desc);

alter table public.substack_daily enable row level security;

insert into public.substack_daily (day, subscriber_count, views)
values
  ${values}
on conflict (day) do update set
  subscriber_count = excluded.subscriber_count,
  views = excluded.views,
  updated_at = now();
`;

const out = path.join(root, "docs/SUBSTACK_DAILY_SEED.sql");
fs.writeFileSync(out, sql);
console.log(`Wrote ${rows.length} rows → ${out}`);
