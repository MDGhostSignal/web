-- =============================================================================
-- Studio Lite — member-editable profile fields
-- =============================================================================
-- Adds the two creator-side URL columns the /studio/profile surface
-- writes. Brands need no new columns (website/description already
-- exist on brands from STUDIO_IDENTITY_SCHEMA.sql).
--
-- Run BEFORE deploying the studio-lite-foundation branch — the
-- profile loader selects these columns and will error until they
-- exist. Additive + idempotent; safe to re-run; no data rewritten.
-- =============================================================================

ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS podcast_url    text,
  ADD COLUMN IF NOT EXISTS newsletter_url text;
