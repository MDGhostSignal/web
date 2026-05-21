-- Mercury (mercury.com) integration — cache tables for the /admin/finance dashboard.
--
-- Applied via the Supabase SQL editor. Rerunning is safe (uses `if not exists`).
--
-- See docs/MERCURY_INTEGRATION.md for the runbook (env vars, cron, recovery).
--
-- Precision is load-bearing: balances and amounts are numeric(20,4). Client-side
-- math converts to bigint cents via the helpers in apps/web/src/lib/mercury-types.ts.
-- Never cast these columns to JS Number.

create table if not exists mercury_accounts (
  id text primary key,
  name text not null,
  kind text,
  account_number_masked text,
  available_balance numeric(20, 4) not null,
  current_balance numeric(20, 4) not null,
  currency text not null default 'USD',
  status text,
  raw jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists mercury_transactions (
  id text primary key,
  account_id text not null references mercury_accounts(id) on delete cascade,
  posted_at timestamptz,
  created_at timestamptz not null,
  amount numeric(20, 4) not null,
  kind text,
  counterparty_name text,
  counterparty_nickname text,
  bank_description text,
  status text not null,
  note text,
  raw jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists mercury_transactions_account_posted_idx
  on mercury_transactions (account_id, posted_at desc);

create index if not exists mercury_transactions_status_idx
  on mercury_transactions (status);

create table if not exists mercury_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  account_count int,
  transaction_count int,
  error_message text
);

create index if not exists mercury_sync_runs_started_idx
  on mercury_sync_runs (started_at desc);

-- Row Level Security.
--
-- These tables are only ever touched from server-side code that uses the
-- Supabase service-role key (see apps/web/src/lib/supabase-admin.ts).
-- The service role bypasses RLS regardless of policies, so enabling RLS
-- with NO policies locks the tables down: anon and authenticated keys
-- get rejected, service-role still works. This is defense-in-depth —
-- if the anon key were ever accidentally exposed in a client bundle,
-- bank balances wouldn't leak.
--
-- Do NOT add policies here. If you ever need to read these tables from
-- a client-side context, build a server-side API route that does the
-- query with the service-role key and returns the data — same pattern
-- as the rest of the admin tree.

alter table mercury_accounts enable row level security;
alter table mercury_transactions enable row level security;
alter table mercury_sync_runs enable row level security;
