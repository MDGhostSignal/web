-- Newsletter-advertising interest, captured on the Studio register
-- page (invite flow, 2026-08-04): a "I am interested in Email
-- Newsletter Advertising" opt-in that reveals provider / open rate /
-- frequency / subscriber-size inputs. Stored on the members row so it
-- lands directly in the CRM contact record.
--
-- Run in the Supabase SQL editor (Martin-run, like all migrations).
-- Until this runs, registration still works — the API drops the NL
-- fields with a server-side warning instead of failing the signup.

alter table public.members
  add column if not exists nl_ads_interest boolean,
  add column if not exists nl_provider text,
  add column if not exists nl_open_rate text,
  add column if not exists nl_frequency text,
  add column if not exists nl_subscribers text;
