-- =============================================================================
-- GhostSignal Members CRM — comments table
-- =============================================================================
--
-- Adds `member_comments` — a simple append-only log of founder notes on a
-- specific member, rendered inline in the expanded row of /admin/members.
--
-- Separate from `members.notes` (which is a single free-form field
-- owned by the member record itself) — comments are multi-author, each
-- stamped with who said what and when.
--
-- Run this once in the Supabase SQL editor AFTER the members schema has
-- been created (v1 + v2). Safe to re-run.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --- Table ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  author      text NOT NULL,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- --- Indexes ---------------------------------------------------------------
-- Newest-first lookup per member is the only access pattern the UI has.
CREATE INDEX IF NOT EXISTS member_comments_member_id_created_idx
  ON member_comments (member_id, created_at DESC);

-- --- RLS --------------------------------------------------------------------
-- All reads + writes go through the Next.js API (service-role key), same
-- policy as the members table itself. RLS stays on and no anon grants.
ALTER TABLE member_comments ENABLE ROW LEVEL SECURITY;
