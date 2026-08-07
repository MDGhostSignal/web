-- Notebook — two raw-text scratch docs for the admin (Business plan +
-- Notes), edited at /admin/tasks/notebook. One row per doc, keyed by a
-- stable slug; the app upserts the body on autosave.
--
-- Run once in the Supabase SQL editor. Until it exists, the Notebook
-- page shows a one-time setup hint and the API refuses writes cleanly.

create table if not exists notebook_docs (
  slug        text primary key,
  body        text not null default '',
  updated_at  timestamptz not null default now()
);

-- RLS on with no policies: the table is reachable only via the
-- service-role key from the proxy-gated admin API (RLS is bypassed for
-- service-role). No anon/authenticated access.
alter table notebook_docs enable row level security;

-- Seed the two fixed docs so the first GET has something to return.
insert into notebook_docs (slug, body) values
  ('business_plan', ''),
  ('notes', '')
on conflict (slug) do nothing;
