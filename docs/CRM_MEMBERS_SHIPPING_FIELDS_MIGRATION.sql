-- =====================================================================
-- Members CRM — Shipping address fields
-- =====================================================================
--
-- Adds six optional shipping-address columns to the `members` table so
-- the team can mail membership boxes (welcome kits, branded swag, etc.)
-- without round-tripping through Mercury/Notion/email to look up
-- addresses.
--
-- All columns are nullable text — no validation at the DB layer
-- (international addresses vary wildly; the team will normalise on the
-- way in via the form). The `shipping_` prefix avoids collisions with
-- the generic `state` keyword and clusters all shipping fields together
-- in SELECT * output.
--
-- Apply once via Supabase SQL editor. Idempotent: re-running is a no-op
-- thanks to `if not exists`.
-- =====================================================================

alter table members
  add column if not exists shipping_address_line1 text,
  add column if not exists shipping_address_line2 text,
  add column if not exists shipping_city          text,
  add column if not exists shipping_state         text,
  add column if not exists shipping_postal_code   text,
  add column if not exists shipping_country       text;

-- Partial index: only members with a populated address get indexed.
-- Cheap to maintain (most rows null until the team backfills) and
-- speeds up the eventual "ready to ship" filter.
create index if not exists members_shipping_ready_idx
  on members (id)
  where shipping_address_line1 is not null
    and shipping_city          is not null
    and shipping_country       is not null;
