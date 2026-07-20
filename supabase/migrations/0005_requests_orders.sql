-- See docs/data_model.md "Requests" and "Orders", docs/user_flows.md Flow C (request ->
-- order conversion) and Flow B (mid-workflow entry with backdated status history).

create table requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id),
  title text not null,
  description text,
  source text not null check (
    source in ('instagram', 'text', 'shopify', 'tiktok', 'email', 'phone', 'in_person', 'returning_customer', 'other')
  ),
  estimated_value numeric(12, 2),
  status_id uuid not null references workflow_statuses(id),
  follow_up_date date,
  reason_lost text,
  converted_order_id uuid, -- FK added below, once `orders` exists
  assigned_user_id uuid references users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create index requests_org_status_idx on requests(organization_id, status_id);
create index requests_org_customer_idx on requests(organization_id, customer_id);
create index requests_org_follow_up_idx on requests(organization_id, follow_up_date);

create trigger requests_set_updated_at
  before update on requests
  for each row execute function app_private.set_updated_at();

create table orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_number text not null,
  customer_id uuid not null references customers(id),
  order_type text not null check (order_type in ('custom', 'existing_product', 'bulk', 'service')),
  requires_production boolean not null default false,
  source text check (
    source in ('instagram', 'text', 'shopify', 'tiktok', 'email', 'phone', 'in_person', 'returning_customer', 'other')
  ),
  assigned_user_id uuid references users(id),
  status_id uuid not null references workflow_statuses(id),
  converted_from_request_id uuid references requests(id),
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  tax_total numeric(12, 2) not null default 0,
  shipping_cost numeric(12, 2) not null default 0,
  deposit_required numeric(12, 2) not null default 0,
  deposit_paid numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  balance_remaining numeric(12, 2) not null default 0,
  promised_date date,
  internal_deadline date,
  fulfillment_method text check (fulfillment_method in ('pickup', 'shipping')),
  shipping_address_id uuid references customer_addresses(id),
  tracking_number text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (organization_id, order_number)
);

create index orders_org_status_idx on orders(organization_id, status_id);
create index orders_org_promised_date_idx on orders(organization_id, promised_date);
create index orders_org_customer_idx on orders(organization_id, customer_id);

create trigger orders_set_updated_at
  before update on orders
  for each row execute function app_private.set_updated_at();

alter table requests
  add constraint requests_converted_order_id_fkey
  foreign key (converted_order_id) references orders(id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid, -- FK added in 0007_products_inventory.sql once `products` exists
  item_type text not null check (item_type in ('catalog_product', 'custom_line_item', 'service', 'repair_charge')),
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  size text,
  color text,
  materials text,
  custom_instructions text,
  reference_image_attachment_id uuid -- FK added in 0012_files.sql once `attachments` exists
);

create index order_items_order_idx on order_items(order_id);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  status_id uuid not null references workflow_statuses(id),
  changed_at timestamptz not null default now(),
  changed_by uuid references users(id),
  source text not null default 'live' check (source in ('live', 'manual_backfill')),
  note text
);

create index order_status_history_order_idx on order_status_history(order_id, changed_at);

-- Order-number generation is a domain-layer concern (server/domain/orders), which calls
-- app_private.next_sequence_value(organization_id, 'order') to get the next integer and
-- formats it (e.g. "PF-1042") — kept out of a trigger so the prefix/format stays a
-- product decision, not a schema constant.

-- Row Level Security -----------------------------------------------------

alter table requests enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;

create policy requests_select on requests
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy requests_insert on requests
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy requests_update on requests
  for update to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));
create policy requests_delete on requests
  for delete to authenticated using (app_private.has_org_role(organization_id, array['owner', 'manager']));

create policy orders_select on orders
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy orders_insert on orders
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy orders_update on orders
  for update to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));
create policy orders_delete on orders
  for delete to authenticated using (app_private.has_org_role(organization_id, array['owner', 'manager']));

create policy order_items_select on order_items
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy order_items_write on order_items
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy order_status_history_select on order_status_history
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy order_status_history_insert on order_status_history
  for insert to authenticated with check (app_private.is_org_member(organization_id));
-- No update/delete policy: status history is append-only, same rationale as activity_logs.
