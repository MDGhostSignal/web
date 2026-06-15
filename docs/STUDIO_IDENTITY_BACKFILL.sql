-- =============================================================================
-- Studio identity backfill — populate brands + creators from existing data
-- =============================================================================
-- Run AFTER docs/STUDIO_IDENTITY_SCHEMA.sql.
--
-- Walks the existing data and:
--   1. Inserts a brand row for every distinct organization where
--      member_type = 'brand'.
--   2. Inserts a creator row for every distinct organization where
--      member_type = 'creator'.
--   3. Links each member to their brand or creator via brand_id /
--      creator_id.
--   4. Denormalizes xq_submissions.xq_code into members.xq_archetype.
--   5. Best-effort match between creators and art19_shows by title.
--   6. Auto-generates slugs for any brand/creator that doesn't have one.
--
-- Idempotent — uses ON CONFLICT DO NOTHING + WHERE IS NULL guards.
-- =============================================================================

-- 1. Brands — one per distinct member.organization (member_type='brand').
INSERT INTO brands (name)
SELECT DISTINCT trim(organization)
FROM members
WHERE member_type = 'brand'
  AND organization IS NOT NULL
  AND trim(organization) <> ''
ON CONFLICT (name) DO NOTHING;

-- 2. Creators — one per distinct member.organization (member_type='creator').
INSERT INTO creators (name)
SELECT DISTINCT trim(organization)
FROM members
WHERE member_type = 'creator'
  AND organization IS NOT NULL
  AND trim(organization) <> ''
ON CONFLICT (name) DO NOTHING;

-- 3a. Link members → brands.
UPDATE members m
SET brand_id = b.id
FROM brands b
WHERE m.member_type = 'brand'
  AND m.brand_id IS NULL
  AND m.organization IS NOT NULL
  AND lower(trim(m.organization)) = lower(b.name);

-- 3b. Link members → creators.
UPDATE members m
SET creator_id = c.id
FROM creators c
WHERE m.member_type = 'creator'
  AND m.creator_id IS NULL
  AND m.organization IS NOT NULL
  AND lower(trim(m.organization)) = lower(c.name);

-- 4. Denormalize xq_submissions.xq_code → members.xq_archetype.
UPDATE members m
SET xq_archetype = x.xq_code
FROM xq_submissions x
WHERE m.xq_submission_id = x.id
  AND m.xq_archetype IS NULL
  AND x.xq_code IS NOT NULL
  AND trim(x.xq_code) <> '';

-- 5. Best-effort match: creators ↔ art19_shows by title equality.
UPDATE creators c
SET art19_show_id = a.id
FROM art19_shows a
WHERE c.art19_show_id IS NULL
  AND lower(trim(c.name)) = lower(trim(a.title));

-- 6. Auto-generate slugs for any unset brand / creator names.
UPDATE brands
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

UPDATE creators
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- =============================================================================
-- Verification queries (paste after the backfill to confirm)
-- =============================================================================
--
-- SELECT count(*) AS brands FROM brands;
-- SELECT count(*) AS creators FROM creators;
-- SELECT count(*) AS members_linked_to_brand FROM members WHERE brand_id IS NOT NULL;
-- SELECT count(*) AS members_linked_to_creator FROM members WHERE creator_id IS NOT NULL;
-- SELECT count(*) AS members_with_archetype FROM members WHERE xq_archetype IS NOT NULL;
-- SELECT count(*) AS creators_matched_to_art19 FROM creators WHERE art19_show_id IS NOT NULL;
--
-- Expected on first run:
--   - brands ≈ count(distinct organization) of brand members
--   - creators ≈ count(distinct organization) of creator members
--   - members_with_archetype = count of members where xq_submission_id IS NOT NULL
--   - creators_matched_to_art19 = creators whose name matches an art19 show title
