-- Extensions, shared helper functions, and conventions used by every later migration.
-- See docs/data_model.md and docs/security.md for the design this implements.

create extension if not exists pgcrypto;

-- Helper functions live outside `public` so they are never exposed as PostgREST RPCs.
create schema if not exists app_private;

-- Every table gets updated_at maintained by this trigger rather than by application code,
-- so it can never be forgotten on a new write path.
create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- app_private.is_org_member() and app_private.has_org_role() are defined in
-- 0002_tenancy.sql, not here: both are `language sql` functions, and unlike
-- `plpgsql`, Postgres validates a SQL-language function's body against the
-- catalog at CREATE FUNCTION time — they can't forward-reference
-- `organization_members`/`roles` before those tables exist. (Found the hard
-- way against a real hosted project; see git history for the original,
-- broken placement if the reasoning here ever needs double-checking.)

-- Backs org-scoped sequential numbers (orders.order_number, repair_tickets.ticket_number)
-- without a race condition under concurrent inserts. Not in the original data_model.md
-- table list; added because "PF-1042"-style numbers need an atomic counter somewhere.
create table app_private.org_sequence_counters (
  organization_id uuid not null,
  sequence_key text not null,
  next_value bigint not null default 1,
  primary key (organization_id, sequence_key)
);

-- Unlike is_org_member()/has_org_role() (app_private — only ever called from inside
-- RLS policy SQL, never by application code), this one IS called directly via
-- supabase.rpc() from server/data/orders.ts. PostgREST only routes RPC calls to
-- functions in an *exposed* schema (public, by default) — putting this in
-- app_private would silently make it unreachable from the client SDK. (Found the
-- hard way: order creation failed with a generic "could not create the order"
-- because this lived in app_private originally. See migration 0019 for the
-- already-deployed fix.)
create or replace function next_sequence_value(p_organization_id uuid, p_sequence_key text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value bigint;
begin
  insert into app_private.org_sequence_counters (organization_id, sequence_key, next_value)
  values (p_organization_id, p_sequence_key, 2)
  on conflict (organization_id, sequence_key)
  do update set next_value = app_private.org_sequence_counters.next_value + 1
  returning next_value - 1 into v_value;
  return v_value;
end;
$$;

revoke all on function next_sequence_value(uuid, text) from public;
grant execute on function next_sequence_value(uuid, text) to authenticated;
