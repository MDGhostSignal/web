-- 2026-04-30 — Allow result columns on rq_submissions to be NULL.
--
-- The two-phase capture flow inserts a row at the lead-capture
-- stage (status='incomplete') before the user has finished the
-- quiz. At that point none of the quiz-result columns exist yet,
-- so they must be nullable. They get populated when the row is
-- PATCHed up to status='complete'.
--
-- Existing rows are unaffected; this only relaxes the column
-- constraints. Application-level validation in the API still
-- requires these fields when status='complete'.

ALTER TABLE rq_submissions ALTER COLUMN rq_code DROP NOT NULL;
ALTER TABLE rq_submissions ALTER COLUMN rq_name DROP NOT NULL;
ALTER TABLE rq_submissions ALTER COLUMN signal_clarity_label DROP NOT NULL;
ALTER TABLE rq_submissions ALTER COLUMN signal_clarity_note DROP NOT NULL;
ALTER TABLE rq_submissions ALTER COLUMN undertone DROP NOT NULL;
