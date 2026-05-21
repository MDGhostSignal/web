-- Marketing Social Scheduler — schema for the /admin/marketing → Social
-- sub-tab.
--
-- One row per planned post. A post may target multiple platforms
-- (Facebook, Instagram, Substack) and carries optional per-platform
-- body overrides. Images live in a separate child table and are
-- backed by Supabase Storage under the existing `marketing-assets`
-- bucket with a `social/<post_id>/...` path prefix.
--
-- See docs/MARKETING_SOCIAL_SCHEDULER.md for the runbook.

do $$ begin
  create type social_post_status as enum ('draft','scheduled','posted','skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type social_platform as enum ('facebook','instagram','substack');
exception when duplicate_object then null; end $$;

create table if not exists social_posts (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text not null,
  body_facebook text,
  body_instagram text,
  body_substack text,
  platforms social_platform[] not null default '{}',
  scheduled_at timestamptz not null,
  posted_at timestamptz,
  status social_post_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_posts_scheduled_at_idx
  on social_posts (scheduled_at);
create index if not exists social_posts_status_idx
  on social_posts (status);
create index if not exists social_posts_platforms_idx
  on social_posts using gin (platforms);

create table if not exists social_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references social_posts(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists social_post_images_post_idx
  on social_post_images (post_id, position);

-- Audit log + dedupe for the daily digest cron (Phase C).
create table if not exists social_post_notifications (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references social_posts(id) on delete cascade,
  channel text not null,
  sent_at timestamptz not null default now()
);
create index if not exists social_post_notifications_post_idx
  on social_post_notifications (post_id, channel, sent_at desc);

-- RLS: enabled with no policies. Service role bypasses; anon /
-- authenticated keys can't touch it.
alter table social_posts enable row level security;
alter table social_post_images enable row level security;
alter table social_post_notifications enable row level security;
