-- Marketing Copy Library — schema for the /admin/marketing → Copy sub-tab.
--
-- Applied via the Supabase SQL editor. Rerunning is safe (`if not exists`
-- on tables/indexes, guarded do-blocks for the enums).
--
-- See docs/MARKETING_COPY_LIBRARY.md for the runbook (seed, taxonomy,
-- editing workflow).
--
-- One row per logical phrase. The seed script inserts ~50 entries
-- harvested from the public website + the social-post packs at the
-- repo root. After seeding, the team can add/edit/tag/favourite
-- through the admin UI.

do $$ begin
  create type copy_snippet_kind as enum (
    'tagline','headline','subhead','value_prop','cta','social_hook','long_form','glossary'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type copy_snippet_persona as enum ('creators','advertisers','both');
exception when duplicate_object then null; end $$;

create table if not exists copy_snippets (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  kind copy_snippet_kind not null,
  persona copy_snippet_persona not null default 'both',
  -- Provenance: usually a file path with optional :line suffix
  -- ("/for-creators/page.tsx:221") or a doc filename
  -- ("social_media_posts.md"). Nullable for user-added entries.
  source text,
  -- Freeform tags. Common values from the seed:
  --   instagram | facebook | linkedin | x | substack — channel hint
  --   hook | story | thread | quote | pull-quote | hashtag — format hint
  --   creator | advertiser — audience hint (mirrors `persona` but free-form for cross-cutting)
  tags text[] not null default '{}',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists copy_snippets_kind_idx
  on copy_snippets (kind);
create index if not exists copy_snippets_persona_idx
  on copy_snippets (persona);
create index if not exists copy_snippets_tags_idx
  on copy_snippets using gin (tags);
create index if not exists copy_snippets_favorite_idx
  on copy_snippets (favorite) where favorite;

-- RLS: enabled with no policies. Service-role bypasses; anon /
-- authenticated keys can't touch it. Same defense-in-depth as the
-- Mercury + Marketing Asset tables.
alter table copy_snippets enable row level security;
