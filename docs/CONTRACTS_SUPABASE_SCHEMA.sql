-- esignatures.com integration — local cache + audit tables.
--
-- Applied via the Supabase SQL editor. Rerunning is safe.
--
-- Architecture notes
-- ──────────────────
-- esignatures.com does NOT expose a contracts list endpoint (verified
-- against their docs + a live probe — `GET /api/contracts` returns
-- 404 `not-supported`). This rules out batch backfill of the team's
-- historical contracts and rules out periodic full-sync. The only
-- mechanisms by which a contract enters this cache are:
--
--   1. We send it via /api/admin/contracts (CRM composer) — we have
--      the returned id immediately and persist it locally.
--   2. esignatures POSTs a webhook event for it — we receive at
--      /api/admin/contracts/webhook, verify HMAC, and upsert.
--   3. An admin pastes a contract id into the "Import by id" form
--      on /admin/contracts — we call GET /api/contracts/<id> once
--      and upsert.
--
-- `raw jsonb` carries the full API payload on every write so anything
-- we add to the schema later is recoverable without re-fetching.
--
-- See docs/CONTRACTS_INTEGRATION.md for the operational runbook.

do $$ begin
  create type contract_status as enum (
    'draft','sent','viewed','signed','declined','expired','withdrawn','completed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type contract_counterparty_kind as enum ('creator','brand','other');
exception when duplicate_object then null; end $$;

create table if not exists contracts (
  id text primary key,                    -- esignatures contract id (uuid)
  template_id text,                       -- esignatures template id; nullable for direct-document contracts
  title text,
  status contract_status not null,
  counterparty_kind contract_counterparty_kind, -- inferred from linked member.member_type, or set manually
  -- Linking back to our CRM
  member_id uuid references members(id) on delete set null,         -- confirmed link
  suggested_member_id uuid references members(id) on delete set null, -- auto-suggested via signer email match
  -- Lifecycle timestamps. May be null until the corresponding event has fired.
  sent_at timestamptz,
  signed_at timestamptz,
  withdrawn_at timestamptz,
  effective_date timestamptz,             -- pulled from placeholder_fields or metadata if present
  expires_at timestamptz,                 -- same
  -- Soft archive (admin-flagged, not a real esignatures state)
  archived_at timestamptz,
  -- Internal notes the admin team types about the contract
  notes text,
  -- Full API payload + user-supplied metadata
  raw jsonb not null,
  metadata jsonb,                         -- includes ghostsignal_member_id when sent via CRM
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_status_idx on contracts (status);
create index if not exists contracts_member_idx on contracts (member_id);
create index if not exists contracts_expires_idx on contracts (expires_at)
  where expires_at is not null;
create index if not exists contracts_suggested_idx on contracts (suggested_member_id)
  where suggested_member_id is not null and member_id is null;
create index if not exists contracts_archived_idx on contracts (archived_at)
  where archived_at is not null;
create index if not exists contracts_metadata_gin on contracts using gin (metadata);

create table if not exists contract_signers (
  id text primary key,                    -- esignatures signer id (uuid)
  contract_id text not null references contracts(id) on delete cascade,
  name text,
  email text,
  status text not null,                   -- 'sent','viewed','signed','declined' (verbatim from API)
  signing_order int,
  viewed_at timestamptz,
  signed_at timestamptz,
  raw jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists contract_signers_contract_idx on contract_signers (contract_id);
create index if not exists contract_signers_email_idx on contract_signers (lower(email));

-- Templates cache — refreshed via GET /api/templates list. Used to drive
-- the composer's template picker without hitting the live API on every
-- modal open.
create table if not exists contract_templates (
  id text primary key,                    -- esignatures template_id (uuid)
  title text not null,
  placeholder_fields jsonb,               -- shape per esignatures docs; may be empty []
  signer_field_ids jsonb,                 -- per-signer field references; may be empty []
  labels text[] not null default '{}',
  raw jsonb not null,
  created_at timestamptz,                 -- timestamp from esignatures (template creation date)
  updated_at timestamptz not null default now()
);

-- Webhook audit + idempotency log. Every event esignatures POSTs to us
-- gets a row, regardless of signature validity, so we can investigate
-- HMAC misconfigurations and replay if needed.
create table if not exists contract_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  event_type text not null,               -- e.g. 'contract-signed', 'signer-viewed-the-contract'
  contract_id text references contracts(id) on delete cascade,
  signature_valid boolean not null,
  raw jsonb not null
);
create index if not exists contract_webhook_events_contract_idx
  on contract_webhook_events (contract_id, received_at desc);
create index if not exists contract_webhook_events_received_idx
  on contract_webhook_events (received_at desc);

-- Sync audit (used by the templates list refresh + ad-hoc resync actions).
create table if not exists contract_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,                   -- 'running' | 'ok' | 'error'
  scope text not null,                    -- 'templates' | 'single-contract' | 'manual-import'
  contract_count int,
  signer_count int,
  template_count int,
  error_message text
);
create index if not exists contract_sync_runs_started_idx
  on contract_sync_runs (started_at desc);

-- RLS enabled with no policies — service-role bypasses, anon/authenticated
-- keys blocked. Same defense-in-depth as the rest of the admin schemas.
alter table contracts enable row level security;
alter table contract_signers enable row level security;
alter table contract_templates enable row level security;
alter table contract_webhook_events enable row level security;
alter table contract_sync_runs enable row level security;
