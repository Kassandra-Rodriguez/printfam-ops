-- See docs/data_model.md "Communications" and docs/user_flows.md Flow H.

create table conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id),
  channel text not null check (
    channel in ('instagram', 'text', 'tiktok_shop', 'shopify', 'email', 'phone', 'in_person', 'other')
  ),
  related_request_id uuid references requests(id),
  related_order_id uuid references orders(id),
  related_repair_ticket_id uuid references repair_tickets(id),
  created_at timestamptz not null default now()
);

create index conversations_org_customer_idx on conversations(organization_id, customer_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  direction text not null check (direction in ('incoming', 'outgoing')),
  body text not null,
  occurred_at timestamptz not null default now(),
  recorded_by uuid references users(id),
  sent_by_customer boolean not null default false,
  follow_up_required boolean not null default false,
  follow_up_date date,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages(conversation_id, occurred_at);
create index messages_org_follow_up_idx on messages(organization_id, follow_up_date) where follow_up_required;

-- Row Level Security -----------------------------------------------------
-- Portal-originated customer messages (sent_by_customer = true) are written by the
-- token-validated Route Handler via the service role, same rationale as 0010_proofs.sql.

alter table conversations enable row level security;
alter table messages enable row level security;

create policy conversations_select on conversations
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy conversations_write on conversations
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy messages_select on messages
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy messages_write on messages
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));
