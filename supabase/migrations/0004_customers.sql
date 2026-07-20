-- See docs/data_model.md "Customers". RLS here enforces the tenant boundary only
-- (any active org member can read/write); the finer Owner/Manager/Team-Member
-- distinctions from docs/user_roles.md are enforced in server/authz per
-- docs/security.md #2 and docs/architecture.md #3 ("defense in depth, not
-- defense-in-one-place") — Team Member's "assigned records only" scope in particular
-- depends on per-record assignment, which RLS alone can't express cleanly without
-- duplicating application business rules into SQL.

create table customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  display_name text not null,
  phone text,
  email text,
  preferred_contact_method text check (
    preferred_contact_method in ('instagram', 'text', 'tiktok', 'email', 'phone', 'in_person', 'other')
  ),
  notes text,
  total_spent numeric(12, 2) not null default 0,
  outstanding_balance numeric(12, 2) not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create index customers_org_name_idx on customers(organization_id, display_name);
create index customers_org_phone_idx on customers(organization_id, phone);
create index customers_org_email_idx on customers(organization_id, email);

create trigger customers_set_updated_at
  before update on customers
  for each row execute function app_private.set_updated_at();

create table customer_identifiers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  kind text not null check (kind in ('phone', 'email', 'instagram', 'tiktok', 'shopify_customer_id')),
  value text not null,
  unique (organization_id, kind, value)
);

create index customer_identifiers_customer_idx on customer_identifiers(customer_id);

create table customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  label text not null check (label in ('shipping', 'billing', 'other')),
  line1 text,
  line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  is_default boolean not null default false
);

create index customer_addresses_customer_idx on customer_addresses(customer_id);

create table customer_tags (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  tag text not null
);

create index customer_tags_customer_idx on customer_tags(customer_id);
create unique index customer_tags_unique_idx on customer_tags(customer_id, tag);

-- Row Level Security -----------------------------------------------------

alter table customers enable row level security;
alter table customer_identifiers enable row level security;
alter table customer_addresses enable row level security;
alter table customer_tags enable row level security;

create policy customers_select on customers
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy customers_insert on customers
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy customers_update on customers
  for update to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));
create policy customers_delete on customers
  for delete to authenticated using (app_private.has_org_role(organization_id, array['owner', 'manager']));

create policy customer_identifiers_select on customer_identifiers
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy customer_identifiers_write on customer_identifiers
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy customer_addresses_select on customer_addresses
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy customer_addresses_write on customer_addresses
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy customer_tags_select on customer_tags
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy customer_tags_write on customer_tags
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));
