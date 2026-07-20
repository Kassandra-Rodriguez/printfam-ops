-- See docs/data_model.md "Payments" and docs/user_flows.md Flow G.
-- `receipt_attachment_id` FK is added in 0012_files.sql once `attachments` exists.

create table payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id),
  order_id uuid references orders(id),
  repair_ticket_id uuid references repair_tickets(id),
  quote_id uuid references quotes(id),
  amount numeric(12, 2) not null,
  method text not null check (
    method in ('cash', 'cash_app', 'zelle', 'card', 'shopify', 'tiktok_shop', 'square', 'bank_transfer', 'other')
  ),
  kind text not null check (kind in ('deposit', 'final', 'full', 'refund')),
  paid_at date not null default current_date,
  reference_number text,
  notes text,
  receipt_attachment_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references users(id),
  constraint payments_single_target_chk check (
    (case when order_id is not null then 1 else 0 end)
    + (case when repair_ticket_id is not null then 1 else 0 end)
    + (case when quote_id is not null then 1 else 0 end) = 1
  )
);

create index payments_org_order_idx on payments(organization_id, order_id);
create index payments_org_repair_idx on payments(organization_id, repair_ticket_id);
create index payments_org_customer_idx on payments(organization_id, customer_id);

-- Row Level Security -----------------------------------------------------

alter table payments enable row level security;

create policy payments_select on payments
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy payments_insert on payments
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy payments_update on payments
  for update to authenticated using (app_private.has_org_role(organization_id, array['owner', 'manager']))
  with check (app_private.has_org_role(organization_id, array['owner', 'manager']));
create policy payments_delete on payments
  for delete to authenticated using (app_private.has_org_role(organization_id, array['owner', 'manager']));
