-- Organizations, users, roles, membership. See docs/data_model.md "Tenant & identity"
-- and docs/user_roles.md for the role matrix these policies enforce.

create table roles (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null
);

-- Global, not org-scoped, in v1 (docs/user_roles.md #5 — relabeling later is a data
-- change via `label`, not a schema migration).
insert into roles (key, label) values
  ('owner', 'Owner'),
  ('manager', 'Manager'),
  ('team_member', 'Team Member');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  brand_color_primary text,
  contact_email text,
  contact_phone text,
  subscription_plan text not null default 'internal',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on organizations
  for each row execute function app_private.set_updated_at();

-- Mirrors auth.users so the rest of the schema can FK to a table it owns, per
-- docs/data_model.md "users" note. Populated by a trigger on auth.users, never
-- written directly by client code.
create table users (
  id uuid primary key,
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function app_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_auth_user();

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  invited_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_org_idx on organization_members(organization_id);
create index organization_members_user_idx on organization_members(user_id);

-- Tenant isolation is membership-based, not "active org in JWT": a user may belong to
-- several organizations (docs/user_roles.md #4), and RLS should allow access to every
-- organization they're a member of. The *active* organization for a given UI session is
-- an application-layer concern (docs/architecture.md #3), enforced in addition to this,
-- not instead of it.
--
-- `language sql` (not plpgsql), so this must come after organization_members exists —
-- Postgres validates a SQL-language function body against the catalog at CREATE
-- FUNCTION time, unlike plpgsql. See the note in 0001_setup.sql.
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

create table organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  default_currency text not null default 'USD',
  notification_preferences jsonb not null default '{}'::jsonb,
  portal_branding jsonb not null default '{}'::jsonb,
  business_hours jsonb not null default '{}'::jsonb
);

-- Bootstraps a brand-new organization: creates the org row and the creating user's
-- Owner membership atomically. This is the *only* way to create an organization —
-- there is deliberately no direct insert policy on `organizations`, so an org can
-- never exist without an Owner (see RLS policies below).
create or replace function create_organization_with_owner(p_name text, p_slug text)
returns organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org organizations;
  v_owner_role_id uuid;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated to create an organization';
  end if;

  select id into v_owner_role_id from roles where key = 'owner';

  insert into organizations (name, slug)
  values (p_name, p_slug)
  returning * into v_org;

  insert into organization_members (organization_id, user_id, role_id, status)
  values (v_org.id, auth.uid(), v_owner_role_id, 'active');

  insert into organization_settings (organization_id)
  values (v_org.id);

  perform seed_default_workflows(v_org.id);

  return v_org;
end;
$$;

revoke all on function create_organization_with_owner(text, text) from public;
grant execute on function create_organization_with_owner(text, text) to authenticated;

-- Row Level Security -----------------------------------------------------

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_settings enable row level security;
alter table users enable row level security;
alter table roles enable row level security;

create policy roles_select_all on roles
  for select to authenticated
  using (true);

create policy organizations_select on organizations
  for select to authenticated
  using (app_private.is_org_member(id));

create policy organizations_update_owner on organizations
  for update to authenticated
  using (app_private.has_org_role(id, array['owner']))
  with check (app_private.has_org_role(id, array['owner']));

-- No insert/delete policy on `organizations`: creation goes through
-- create_organization_with_owner(); deletion is a Phase-8+ Owner-only feature not
-- yet built, deliberately left with no policy (fails closed) until it is.

create policy organization_members_select on organization_members
  for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy organization_members_insert_owner on organization_members
  for insert to authenticated
  with check (app_private.has_org_role(organization_id, array['owner']));

create policy organization_members_update_owner on organization_members
  for update to authenticated
  using (app_private.has_org_role(organization_id, array['owner']))
  with check (app_private.has_org_role(organization_id, array['owner']));

create policy organization_members_delete_owner on organization_members
  for delete to authenticated
  using (app_private.has_org_role(organization_id, array['owner']));

create policy organization_settings_select on organization_settings
  for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy organization_settings_write_owner on organization_settings
  for all to authenticated
  using (app_private.has_org_role(organization_id, array['owner']))
  with check (app_private.has_org_role(organization_id, array['owner']));

create policy users_select on users
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from organization_members m1
      join organization_members m2 on m1.organization_id = m2.organization_id
      where m1.user_id = auth.uid() and m1.status = 'active'
        and m2.user_id = users.id and m2.status = 'active'
    )
  );

create policy users_update_self on users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
