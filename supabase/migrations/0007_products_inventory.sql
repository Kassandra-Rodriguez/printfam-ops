-- See docs/data_model.md "Products & inventory". `cost` is excluded from any query path
-- reachable by Team Member/Customer contexts at the application layer (docs/security.md
-- #3) — RLS here only enforces the tenant boundary, matching the pattern established in
-- 0004_customers.sql.

create table products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  category text,
  sku text,
  selling_price numeric(12, 2) not null default 0,
  cost numeric(12, 2),
  available_quantity integer not null default 0,
  reserved_quantity integer not null default 0,
  reorder_level integer not null default 0,
  is_active boolean not null default true,
  customization_options jsonb not null default '{}'::jsonb,
  production_notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (organization_id, sku)
);

create index products_org_active_idx on products(organization_id, is_active);

create trigger products_set_updated_at
  before update on products
  for each row execute function app_private.set_updated_at();

alter table order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id) references products(id);

create table inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id),
  order_id uuid references orders(id),
  quantity_delta integer not null,
  reason text not null check (reason in ('order_fulfillment', 'manual_adjustment', 'restock', 'correction')),
  note text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create index inventory_transactions_product_idx on inventory_transactions(product_id, created_at);

-- Row Level Security -----------------------------------------------------

alter table products enable row level security;
alter table inventory_transactions enable row level security;

create policy products_select on products
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy products_write on products
  for all to authenticated using (app_private.has_org_role(organization_id, array['owner', 'manager']))
  with check (app_private.has_org_role(organization_id, array['owner', 'manager']));

create policy inventory_transactions_select on inventory_transactions
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy inventory_transactions_insert on inventory_transactions
  for insert to authenticated with check (app_private.is_org_member(organization_id));
