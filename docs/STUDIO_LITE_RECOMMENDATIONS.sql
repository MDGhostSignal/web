-- =============================================================================
-- Studio Lite — team-curated brand recommendations
-- =============================================================================
-- The GhostSignal team hand-picks brands for a specific member; the
-- member's brand-roster deck leads with those picks, badged
-- "GhostSignal Pick". The four-pick count is editorial convention —
-- the loader takes the top 4 by position; the table doesn't enforce it.
--
-- Admin UI: /admin/studio-picks (Studio → GS Picks) manages rows via
-- replace-all saves through PUT /api/admin/studio/picks. Manual SQL
-- still works if ever needed:
--   INSERT INTO studio_brand_recommendations (member_id, brand_id, position)
--   VALUES ('<member uuid>', '<brand uuid>', 1);
--
-- Additive + idempotent; safe to re-run. The roster code tolerates
-- this table not existing yet (no recommendations shown), so deploy
-- order doesn't matter.
-- =============================================================================

CREATE TABLE IF NOT EXISTS studio_brand_recommendations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  brand_id   uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  -- 1..n ordering within a member's picks; lowest leads the deck.
  position   smallint NOT NULL DEFAULT 1,
  -- Optional one-liner from the team ("why we picked this for you").
  note       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studio_brand_recommendations_unique UNIQUE (member_id, brand_id)
);

CREATE INDEX IF NOT EXISTS studio_brand_recommendations_member_idx
  ON studio_brand_recommendations (member_id);

-- Service-role only, matching the members/brands/creators convention:
-- RLS enabled with no policies; the Next.js server mediates all access.
ALTER TABLE studio_brand_recommendations ENABLE ROW LEVEL SECURITY;
