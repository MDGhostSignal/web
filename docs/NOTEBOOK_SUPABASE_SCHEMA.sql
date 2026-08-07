-- Notebook — plain-text scratch pages for the admin, edited at
-- /admin/tasks/notebook. One row per page (Google-Sheets-style tabs);
-- pages can be added, renamed, and deleted from the UI. The app upserts
-- the body on autosave.
--
-- Run once in the Supabase SQL editor. Until it exists, the Notebook
-- page shows a one-time setup hint and the API refuses writes cleanly.

create table if not exists notebook_docs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default 'Untitled',
  body        text not null default '',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS on with no policies: reachable only via the service-role key from
-- the proxy-gated admin API (RLS is bypassed for service-role). No
-- anon/authenticated access.
alter table notebook_docs enable row level security;

-- Seed the two starter pages, but only if the table is empty (so re-runs
-- don't duplicate them).
insert into notebook_docs (title, body, position)
select v.title, v.body, v.position
from (values
  ('Business plan', '', 0),
  ('Notes', '', 1)
) as v(title, body, position)
where not exists (select 1 from notebook_docs);
