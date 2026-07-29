-- =============================================================================
-- Studio Lite — contact requests (member → brand, brokered by GS)
-- =============================================================================
-- The roster's brand pop-up has a "Request an intro" action. It files
-- a row here; the GhostSignal team picks it up and brokers the intro
-- (no automated matching/messaging — matching stays human). Admin UI:
-- /admin/studio-requests (Studio → Intro Requests) lists rows and
-- flips status via PATCH /api/admin/studio/requests/[id].
--
-- One open request per (member, brand) — a second click surfaces
-- "already requested" instead of piling up duplicates.
--
-- Additive + idempotent; safe to re-run. The POST route returns a
-- friendly error until this table exists, so deploy order is safe.
-- =============================================================================

CREATE TABLE IF NOT EXISTS studio_contact_requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  brand_id   uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  message    text,
  -- new | in_progress | done | declined — team-managed, free-form for now.
  status     text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT studio_contact_requests_unique UNIQUE (member_id, brand_id)
);

CREATE INDEX IF NOT EXISTS studio_contact_requests_member_idx
  ON studio_contact_requests (member_id);
CREATE INDEX IF NOT EXISTS studio_contact_requests_brand_idx
  ON studio_contact_requests (brand_id);

-- Service-role only (RLS on, no policies) — Next.js server mediates.
ALTER TABLE studio_contact_requests ENABLE ROW LEVEL SECURITY;
