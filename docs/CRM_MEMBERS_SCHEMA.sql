-- =============================================================================
-- GhostSignal Members CRM — schema
-- =============================================================================
--
-- Run this once in the Supabase SQL editor (same project as rq_submissions).
-- Creates the `members` table used by the /admin/members CRM, completely
-- separate from `rq_submissions` so the two datasets stay decoupled. A
-- nullable foreign key let us *link* a member record to the RQ submission
-- they filled in (if any) without mixing the two.
--
-- Safe to re-run: uses `IF NOT EXISTS` / `DO $$ ... EXCEPTION` guards so a
-- second run won't drop existing data.
-- =============================================================================

-- gen_random_uuid() lives in pgcrypto. Supabase projects usually have this
-- enabled already but it's cheap to ensure.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --- Enum: member_type -------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE member_type AS ENUM ('creator', 'brand', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --- Enum: member_stage ------------------------------------------------------
-- Onboarding + lifecycle stages. Ordering below mirrors the canonical
-- progression so `ORDER BY stage` sorts the pipeline left-to-right.
DO $$ BEGIN
  CREATE TYPE member_stage AS ENUM (
    'lead',        -- first contact; has not yet agreed to anything
    'discern',     -- in the "Discern Fit" phase of the journey
    'onboarding',  -- signed + currently being onboarded
    'active',      -- live member, actively partnered
    'paused',      -- on hold (by either side)
    'churned'      -- formally ended
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --- Table: members ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- Identity
  first_name       text,
  last_name        text,
  email            text,
  phone            text,

  -- Work context
  member_type      member_type NOT NULL DEFAULT 'creator',
  organization    text,           -- show name (creator) or company (brand)
  role             text,
  website          text,

  -- Pipeline state
  stage            member_stage NOT NULL DEFAULT 'lead',
  owner            text,           -- which team member owns this relationship
  next_step        text,
  last_contact_at  timestamptz,

  -- Free-form notes + tags
  notes            text,
  tags             text[] NOT NULL DEFAULT '{}',

  -- Optional link back to the RQ quiz submission this member filled in.
  -- Nullable so members who came in through other channels (cold intro,
  -- existing network) don't need an RQ row to exist.
  rq_submission_id uuid
);

-- Partial index on email so case-insensitive duplicate lookups are fast.
CREATE INDEX IF NOT EXISTS members_email_lower_idx
  ON members (lower(email))
  WHERE email IS NOT NULL;

-- Index on stage for pipeline filter queries.
CREATE INDEX IF NOT EXISTS members_stage_idx ON members (stage);

-- Index on owner for per-person dashboards.
CREATE INDEX IF NOT EXISTS members_owner_idx ON members (owner);

-- --- Trigger: keep updated_at in sync ---------------------------------------
CREATE OR REPLACE FUNCTION members_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS members_updated_at ON members;
CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION members_set_updated_at();

-- --- RLS ---------------------------------------------------------------------
-- All reads + writes happen through the Next.js API which uses the
-- service-role key, so we don't need public access. RLS stays ON and no
-- anon policies are granted — the service role bypasses RLS automatically.
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
