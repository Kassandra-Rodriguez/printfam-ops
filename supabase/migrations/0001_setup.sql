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

-- Tenant isolation is membership-based, not "active org in JWT": a user may belong to
-- several organizations (docs/user_roles.md #4), and RLS should allow access to every
-- organization they're a member of. The *active* organization for a given UI session is
-- an application-layer concern (docs/architecture.md #3), enforced in addition to this,
-- not instead of it.
create or replace function app_private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

-- Role check used by RLS policies that need Owner/Manager-only write access
-- (e.g. organization_settings, workflow_statuses). Team Member's narrower
-- "assigned records only" scope is enforced at the application layer
-- (docs/security.md #2) since it depends on per-entity assignment, not role alone.
create or replace function app_private.has_org_role(p_organization_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members m
    join roles r on r.id = m.role_id
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and r.key = any(p_roles)
  );
$$;

revoke all on function app_private.is_org_member(uuid) from public;
revoke all on function app_private.has_org_role(uuid, text[]) from public;
grant execute on function app_private.is_org_member(uuid) to authenticated;
grant execute on function app_private.has_org_role(uuid, text[]) to authenticated;

-- Backs org-scoped sequential numbers (orders.order_number, repair_tickets.ticket_number)
-- without a race condition under concurrent inserts. Not in the original data_model.md
-- table list; added because "PF-1042"-style numbers need an atomic counter somewhere.
create table app_private.org_sequence_counters (
  organization_id uuid not null,
  sequence_key text not null,
  next_value bigint not null default 1,
  primary key (organization_id, sequence_key)
);

create or replace function app_private.next_sequence_value(p_organization_id uuid, p_sequence_key text)
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

revoke all on function app_private.next_sequence_value(uuid, text) from public;
grant execute on function app_private.next_sequence_value(uuid, text) to authenticated;
