-- =============================================================================
-- Studio Lite — short description (tagline) for the welcome-card roster
-- =============================================================================
-- The roster's business-card view shows a one-liner on the card face;
-- the full description lives in the click-through detail panel. Both
-- sides get the column so creator cards can use it when their card
-- design lands.
--
-- Additive + idempotent; safe to re-run. The loaders fall back to a
-- tagline-less select if this hasn't run yet, so deploy order doesn't
-- matter.
-- =============================================================================

ALTER TABLE brands   ADD COLUMN IF NOT EXISTS tagline text;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS tagline text;
