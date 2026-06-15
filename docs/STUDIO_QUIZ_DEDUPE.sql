-- =============================================================================
-- Studio identity — XQ + RQ submission dedupe
-- =============================================================================
-- Collapses duplicate (incomplete + complete) quiz submissions per email
-- and installs forward-looking triggers so future incomplete→complete
-- transitions auto-dedupe.
--
-- Behavior:
--   - For each email that has BOTH an incomplete and a complete row:
--     1. UPDATE any member rows that point to the incomplete via
--        xq_submission_id / rq_submission_id so they instead point at
--        the canonical complete row (and refresh the denormalized
--        xq_archetype / rq_code + completed_at fields).
--     2. DELETE the now-orphaned incomplete row.
--   - Emails with only-incomplete rows are kept as-is — those are
--     warm leads who never finished the quiz, and we want to keep
--     their contact information.
--
-- Run order: after STUDIO_IDENTITY_SCHEMA.sql + STUDIO_IDENTITY_BACKFILL.sql.
-- Applied via Supabase SQL editor 2026-06-15.
-- =============================================================================

-- 1. XQ backfill — re-point members from incomplete to complete, then delete.
UPDATE members m
SET xq_submission_id = c.id,
    xq_archetype     = c.xq_code,
    xq_completed_at  = c.submitted_at
FROM xq_submissions c
WHERE c.status = 'complete'
  AND c.email IS NOT NULL
  AND m.xq_submission_id IN (
    SELECT i.id FROM xq_submissions i
    WHERE i.status = 'incomplete'
      AND i.email IS NOT NULL
      AND lower(trim(i.email)) = lower(trim(c.email))
  );

DELETE FROM xq_submissions x
WHERE x.status = 'incomplete'
  AND x.email IS NOT NULL
  AND trim(x.email) <> ''
  AND EXISTS (
    SELECT 1 FROM xq_submissions c
    WHERE c.status = 'complete'
      AND c.email IS NOT NULL
      AND lower(trim(c.email)) = lower(trim(x.email))
  );

-- 2. RQ backfill — same pattern.
UPDATE members m
SET rq_submission_id = c.id,
    rq_code          = c.rq_code,
    rq_completed_at  = c.submitted_at
FROM rq_submissions c
WHERE c.status = 'complete'
  AND c.email IS NOT NULL
  AND m.rq_submission_id IN (
    SELECT i.id FROM rq_submissions i
    WHERE i.status = 'incomplete'
      AND i.email IS NOT NULL
      AND lower(trim(i.email)) = lower(trim(c.email))
  );

DELETE FROM rq_submissions r
WHERE r.status = 'incomplete'
  AND r.email IS NOT NULL
  AND trim(r.email) <> ''
  AND EXISTS (
    SELECT 1 FROM rq_submissions c
    WHERE c.status = 'complete'
      AND c.email IS NOT NULL
      AND lower(trim(c.email)) = lower(trim(r.email))
  );

-- 3. XQ forward trigger.
CREATE OR REPLACE FUNCTION dedupe_xq_on_complete()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'complete' AND NEW.email IS NOT NULL AND trim(NEW.email) <> '' THEN
    UPDATE members
    SET xq_submission_id = NEW.id,
        xq_archetype     = NEW.xq_code,
        xq_completed_at  = NEW.submitted_at
    WHERE xq_submission_id IN (
      SELECT id FROM xq_submissions
      WHERE id <> NEW.id
        AND status = 'incomplete'
        AND email IS NOT NULL
        AND lower(trim(email)) = lower(trim(NEW.email))
    );
    DELETE FROM xq_submissions
    WHERE id <> NEW.id
      AND status = 'incomplete'
      AND email IS NOT NULL
      AND lower(trim(email)) = lower(trim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS xq_submissions_dedupe ON xq_submissions;
CREATE TRIGGER xq_submissions_dedupe
  AFTER INSERT OR UPDATE OF status ON xq_submissions
  FOR EACH ROW
  WHEN (NEW.status = 'complete')
  EXECUTE FUNCTION dedupe_xq_on_complete();

-- 4. RQ forward trigger.
CREATE OR REPLACE FUNCTION dedupe_rq_on_complete()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'complete' AND NEW.email IS NOT NULL AND trim(NEW.email) <> '' THEN
    UPDATE members
    SET rq_submission_id = NEW.id,
        rq_code          = NEW.rq_code,
        rq_completed_at  = NEW.submitted_at
    WHERE rq_submission_id IN (
      SELECT id FROM rq_submissions
      WHERE id <> NEW.id
        AND status = 'incomplete'
        AND email IS NOT NULL
        AND lower(trim(email)) = lower(trim(NEW.email))
    );
    DELETE FROM rq_submissions
    WHERE id <> NEW.id
      AND status = 'incomplete'
      AND email IS NOT NULL
      AND lower(trim(email)) = lower(trim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rq_submissions_dedupe ON rq_submissions;
CREATE TRIGGER rq_submissions_dedupe
  AFTER INSERT OR UPDATE OF status ON rq_submissions
  FOR EACH ROW
  WHEN (NEW.status = 'complete')
  EXECUTE FUNCTION dedupe_rq_on_complete();
