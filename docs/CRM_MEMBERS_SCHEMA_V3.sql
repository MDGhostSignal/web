-- =============================================================================
-- GhostSignal Members CRM — schema v3
-- =============================================================================
--
-- Builds on CRM_MEMBERS_SCHEMA_V2.sql. Adds two outreach-tracking
-- columns surfaced as inline-editable fields on the expanded lead
-- card in /admin/leads:
--
--   - `contact_count`  integer  — total outreach touches (manual).
--   - `last_response`  text     — free-text capture of the most recent
--                                 reply ("Said yes to a meeting",
--                                 "Wants to revisit in Q3", etc.).
--
-- Run this once in the Supabase SQL editor AFTER the v2 schema has
-- been applied. Safe to re-run: uses IF NOT EXISTS.
-- =============================================================================

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS contact_count integer,
  ADD COLUMN IF NOT EXISTS last_response text,
  ADD COLUMN IF NOT EXISTS became_member_at timestamptz;

-- Backfill: leave existing rows with NULL — these fields are
-- intentionally optional. `became_member_at IS NULL` is the canonical
-- "still a lead" marker; once set, the lead is grayed out in
-- /admin/leads and surfaced in the marketplace pool on
-- /admin/marketplace.

-- Partial index for the marketplace pool query, which only ever wants
-- rows where became_member_at IS NOT NULL. Tiny but worth it because
-- the pool is fetched on every page load.
CREATE INDEX IF NOT EXISTS members_became_member_at_idx
  ON members (became_member_at)
  WHERE became_member_at IS NOT NULL;
