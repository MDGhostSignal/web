-- =============================================================================
-- Studio identity layer — brands + creators + members extensions
-- =============================================================================
-- Adds two canonical entity tables (brands for companies, creators for
-- shows) and extends the existing members table with auth + linkage
-- columns. Members continue to be the human contacts; brand_id /
-- creator_id point at the company/show they represent.
--
-- Run order:
--   1. docs/STUDIO_IDENTITY_SCHEMA.sql      (this file — DDL)
--   2. docs/STUDIO_IDENTITY_BACKFILL.sql    (DML — populates from existing data)
--
-- All ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS — safe to
-- re-run. No existing data is rewritten by this file.
--
-- BEFORE RUNNING: take a snapshot via apps/web/scripts/snapshot-pre-migration.mjs.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --- brands -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text,
  website     text,
  logo_url    text,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT brands_name_unique UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS brands_slug_idx ON brands (slug);

-- --- creators ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS creators (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text,
  art19_show_id text REFERENCES art19_shows(id) ON DELETE SET NULL,
  avatar_url    text,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creators_name_unique UNIQUE (name)
);
CREATE INDEX IF NOT EXISTS creators_slug_idx ON creators (slug);
CREATE INDEX IF NOT EXISTS creators_art19_show_idx ON creators (art19_show_id);

-- --- members extensions -----------------------------------------------------
-- auth_user_id binds a member to a Supabase auth user once they
-- activate their Studio login. brand_id / creator_id replace the
-- string-based organization linkage with proper FKs. xq_archetype is
-- denormalized from xq_submissions.xq_code so the world client can
-- read it without joining each frame.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS auth_user_id  uuid REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand_id      uuid REFERENCES brands ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS creator_id    uuid REFERENCES creators ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS xq_archetype  text,
  ADD COLUMN IF NOT EXISTS invited_at    timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

CREATE INDEX IF NOT EXISTS members_auth_user_idx ON members (auth_user_id)
  WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS members_brand_idx ON members (brand_id)
  WHERE brand_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS members_creator_idx ON members (creator_id)
  WHERE creator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS members_archetype_idx ON members (xq_archetype)
  WHERE xq_archetype IS NOT NULL;

-- --- updated_at triggers ----------------------------------------------------
CREATE OR REPLACE FUNCTION brands_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS brands_updated_at ON brands;
CREATE TRIGGER brands_updated_at BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION brands_set_updated_at();

CREATE OR REPLACE FUNCTION creators_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS creators_updated_at ON creators;
CREATE TRIGGER creators_updated_at BEFORE UPDATE ON creators
  FOR EACH ROW EXECUTE FUNCTION creators_set_updated_at();

-- --- RLS (service-role only, matches existing members table pattern) -------
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
-- No policies defined — only the Supabase service role key can
-- read/write these tables. This matches the members table
-- convention; the Next.js API mediates all reads/writes.
