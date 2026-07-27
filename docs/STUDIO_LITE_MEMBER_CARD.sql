-- =============================================================================
-- Studio Lite — personal card fields for members without an org row
-- =============================================================================
-- Members signed in as a private person (member_type 'other', or a
-- brand/creator whose org link hasn't been made yet) edit their card
-- from their own members row: descriptive text (bio), a card tagline,
-- and the existing avatar_url image.
--
-- Additive + idempotent; safe to re-run. Loaders fall back to a
-- select without these columns until this runs; the profile SAVE for
-- personal accounts needs the columns, so run this before those
-- members start editing.
-- =============================================================================

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS bio     text;
