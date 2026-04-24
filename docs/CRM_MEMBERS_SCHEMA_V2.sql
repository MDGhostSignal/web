-- =============================================================================
-- GhostSignal Members CRM — schema v2
-- =============================================================================
--
-- Builds on CRM_MEMBERS_SCHEMA.sql. Adds:
--   - `member_phase` enum (5 pipeline phases + paused + churned)
--   - `phase` column (replaces `stage`)
--   - `phase_entered_at` timestamp (powers "rot" detection)
--   - `lifecycle_steps` jsonb column (Jack's 12-step checklist)
--   - trigger that refreshes `phase_entered_at` when `phase` changes
--
-- Run this once in the Supabase SQL editor AFTER the v1 schema has
-- been applied. Backfills any existing rows from `stage` → `phase`
-- before dropping the old stage column + enum.
--
-- Safe to re-run: all steps use IF NOT EXISTS / EXCEPTION guards.
-- =============================================================================

-- --- Enum: member_phase -----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE member_phase AS ENUM (
    'discern',   -- fit evaluation
    'court',     -- outreach + meetings + RQ quiz
    'sign',      -- membership contract out / signed
    'onboard',   -- welcome box + paperwork + hosting migration
    'run',       -- live, running campaigns
    'paused',    -- on hold (by either side)
    'churned'    -- formally ended
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --- Column: phase ----------------------------------------------------------
-- Default 'discern' lets the NOT NULL constraint pass for any
-- pre-existing rows before we backfill from `stage`.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS phase member_phase NOT NULL DEFAULT 'discern';

-- --- Backfill phase from legacy stage --------------------------------------
-- Only runs when the `stage` column still exists (i.e. first time this
-- migration is applied). Subsequent re-runs skip this block.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'stage'
  ) THEN
    UPDATE members SET phase = CASE stage::text
      WHEN 'lead'       THEN 'discern'::member_phase
      WHEN 'discern'    THEN 'discern'::member_phase
      WHEN 'onboarding' THEN 'onboard'::member_phase
      WHEN 'active'     THEN 'run'::member_phase
      WHEN 'paused'     THEN 'paused'::member_phase
      WHEN 'churned'    THEN 'churned'::member_phase
      ELSE 'discern'::member_phase
    END;
  END IF;
END $$;

-- --- Column: phase_entered_at ----------------------------------------------
-- Tracks when the current phase started. A trigger (below) refreshes
-- this whenever `phase` changes so "days in phase" / rot detection
-- isn't contaminated by unrelated row updates.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS phase_entered_at timestamptz NOT NULL DEFAULT now();

-- --- Column: lifecycle_steps (jsonb) ---------------------------------------
-- Shape (see src/lib/members.ts for the typed version):
--   {
--     "<step_key>": { "status": "todo|doing|done|skipped|na", "completed_at": "YYYY-MM-DD" | null },
--     ...
--   }
-- Default is empty object — the API route seeds the 12 known step
-- keys on create, and the UI tolerates missing keys (treats them as
-- "todo", or "na" if the step is creator-only and the member isn't a
-- creator).
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS lifecycle_steps jsonb NOT NULL DEFAULT '{}'::jsonb;

-- --- Indexes ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS members_phase_idx ON members (phase);
CREATE INDEX IF NOT EXISTS members_phase_entered_at_idx
  ON members (phase_entered_at);

-- --- Trigger: refresh phase_entered_at on phase change ---------------------
CREATE OR REPLACE FUNCTION members_touch_phase_entered_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.phase IS DISTINCT FROM OLD.phase THEN
    NEW.phase_entered_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS members_phase_entered_at ON members;
CREATE TRIGGER members_phase_entered_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION members_touch_phase_entered_at();

-- --- Drop the legacy stage column + enum -----------------------------------
-- Done last so the backfill above can still read from it. Guarded so
-- re-runs are no-ops once the column is already gone.
DROP INDEX IF EXISTS members_stage_idx;
ALTER TABLE members DROP COLUMN IF EXISTS stage;
DROP TYPE IF EXISTS member_stage;
