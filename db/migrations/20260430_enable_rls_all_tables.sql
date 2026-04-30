-- 2026-04-30 — Enable Row-Level Security on every table this app
-- owns. Supabase's automated security check flags any public-schema
-- table without RLS as critical because the public anon key (which
-- ships in any client-side bundle) can otherwise read/write the
-- table directly via PostgREST.
--
-- This codebase only talks to Supabase from server-side API routes
-- using SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS by design, so
-- enabling RLS does not require any policy work. The anon key is not
-- used anywhere in the frontend.
--
-- "ENABLE ROW LEVEL SECURITY" without any explicit policy means:
--   - service_role: still has full access (RLS bypassed)
--   - anon, authenticated: blocked from reading or writing
--
-- That's exactly the posture we want.

ALTER TABLE rq_submissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_comments     ENABLE ROW LEVEL SECURITY;

-- Verification: after running, the Supabase Auth advisor should
-- report 0 critical RLS issues for these tables.
