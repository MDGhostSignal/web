-- =====================================================================
-- CRM_MEMBERS — avatar_url migration
-- Adds the column that backs the ID-card avatar on the marketplace
-- pool's expanded member panel.
--
-- Run once in the Supabase SQL editor. Idempotent (uses `if not exists`).
-- =====================================================================

alter table public.members
  add column if not exists avatar_url text;

-- Uploaded image bytes live in the SAME Supabase Storage bucket the
-- Marketing Asset Library uses (`marketing-assets`, defined via the
-- MARKETING_ASSETS_BUCKET env var). Paths are namespaced under a
-- `member-avatars/` prefix so member faces / brand logos don't collide
-- with marketing files. The bucket itself is public — already created
-- and configured for the Marketing Asset Library; no new bucket setup
-- is required.
--
-- Example stored value:
--   https://<project-ref>.supabase.co/storage/v1/object/public/
--     marketing-assets/member-avatars/<member-uuid>.jpg
--
-- The avatar upload route (POST /api/members/[id]/avatar) is the only
-- writer; the column is a plain text URL (or NULL = no avatar yet).
