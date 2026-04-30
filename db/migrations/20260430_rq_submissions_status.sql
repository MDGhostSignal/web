-- 2026-04-30 — Add `status` column to rq_submissions to support
-- two-phase capture: 'incomplete' (lead captured after the contact
-- step of the RQ quiz, before quiz answers exist) and 'complete'
-- (full quiz submitted). Existing rows are all complete, so the
-- default keeps them correct.
--
-- Note: matches the CHECK-constraint pattern we standardized on
-- after the 2026-04-29 evening design_tasks status drift incident.

ALTER TABLE rq_submissions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'complete';

ALTER TABLE rq_submissions
  DROP CONSTRAINT IF EXISTS rq_submissions_status_check;

ALTER TABLE rq_submissions
  ADD CONSTRAINT rq_submissions_status_check
  CHECK (status IN ('incomplete', 'complete'));

CREATE INDEX IF NOT EXISTS rq_submissions_status_idx
  ON rq_submissions (status);
