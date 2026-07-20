-- See docs/data_model.md "Quotes" and docs/user_flows.md Flow E.

create table quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id),
  request_id uuid references requests(id),
  status_id uuid not null references workflow_statuses(id),
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  tax_total numeric(12, 2) not null default 0,
  shipping_cost numeric(12, 2) not null default 0,
  deposit_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  expires_at date,
  terms text,
  customer_notes text,
  sent_at timestamptz,
  viewed_at timestamptz,
  approved_at timestamptz,
  declined_at timestamptz,
  converted_order_id uuid references orders(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create index quotes_org_status_idx on quotes(organization_id, status_id);
create index quotes_org_customer_idx on quotes(organization_id, customer_id);

create trigger quotes_set_updated_at
  before update on quotes
  for each row execute function app_private.set_updated_at();

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  item_type text not null check (item_type in ('product', 'labor', 'material', 'custom'))
);

create index quote_items_quote_idx on quote_items(quote_id);

create table quote_status_history (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  status_id uuid not null references workflow_statuses(id),
  changed_at timestamptz not null default now(),
  changed_by uuid references users(id),
  source text not null default 'live' check (source in ('live', 'manual_backfill')),
  note text
);

create index quote_status_history_quote_idx on quote_status_history(quote_id, changed_at);

-- Row Level Security -----------------------------------------------------

alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table quote_status_history enable row level security;

create policy quotes_select on quotes
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy quotes_insert on quotes
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy quotes_update on quotes
  for update to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));
create policy quotes_delete on quotes
  for delete to authenticated using (app_private.has_org_role(organization_id, array['owner', 'manager']));

create policy quote_items_select on quote_items
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy quote_items_write on quote_items
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy quote_status_history_select on quote_status_history
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy quote_status_history_insert on quote_status_history
  for insert to authenticated with check (app_private.is_org_member(organization_id));
