-- See docs/data_model.md "Tasks". Same explicit-FK linking pattern as `attachments`.

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  assigned_user_id uuid references users(id),
  due_date date,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'completed', 'dismissed')),
  reminder_at timestamptz,
  customer_id uuid references customers(id),
  request_id uuid references requests(id),
  order_id uuid references orders(id),
  repair_ticket_id uuid references repair_tickets(id),
  proof_id uuid references proofs(id),
  quote_id uuid references quotes(id),
  auto_suggested boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create index tasks_org_assignee_due_idx on tasks(organization_id, assigned_user_id, due_date);
create index tasks_org_status_idx on tasks(organization_id, status);

-- Row Level Security -----------------------------------------------------

alter table tasks enable row level security;

create policy tasks_select on tasks
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy tasks_write on tasks
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));
