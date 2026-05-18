-- =============================================================================
-- design_tasks — add `assigned_to` column
-- =============================================================================
--
-- The /admin/tasks page (formerly /admin/design-tasks) now supports
-- assigning each task to one of the four founders, separate from the
-- creator. Mike can create a task for Martin, etc. The filter bar
-- gains an assignee row so a founder can show "just my tasks".
--
-- The DB table name stays `design_tasks` (renaming would force a
-- coordinated cutover across the API + comments table). The new column
-- is plain text rather than an enum so the founder list stays in app
-- code (it's the same MEMBER_OWNERS list used elsewhere).
--
-- Run once in the Supabase SQL editor. Safe to re-run.
-- =============================================================================

ALTER TABLE design_tasks
  ADD COLUMN IF NOT EXISTS assigned_to text;

-- No backfill — leaving the column NULL on existing rows reads as
-- "unassigned" in the UI; founders can pick an assignee on the first
-- edit.

CREATE INDEX IF NOT EXISTS design_tasks_assigned_to_idx
  ON design_tasks (assigned_to)
  WHERE assigned_to IS NOT NULL;
