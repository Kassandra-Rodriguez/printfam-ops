-- See docs/data_model.md "Repairs" and docs/user_flows.md Flow D.

create table repair_tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  ticket_number text not null,
  customer_id uuid not null references customers(id),
  device_model text not null,
  serial_number text,
  reported_issue text not null,
  error_codes text,
  intake_date date not null default current_date,
  condition_at_intake text,
  accessories_received text,
  status_id uuid not null references workflow_statuses(id),
  diagnostic_fee numeric(12, 2),
  identified_problem text,
  recommended_repair text,
  customer_approved_at timestamptz,
  labor_cost numeric(12, 2),
  final_balance numeric(12, 2) not null default 0,
  warranty_period_days integer,
  completed_summary text,
  assigned_user_id uuid references users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (organization_id, ticket_number)
);

create index repair_tickets_org_status_idx on repair_tickets(organization_id, status_id);
create index repair_tickets_org_customer_idx on repair_tickets(organization_id, customer_id);

create trigger repair_tickets_set_updated_at
  before update on repair_tickets
  for each row execute function app_private.set_updated_at();

create table repair_diagnostics (
  id uuid primary key default gen_random_uuid(),
  repair_ticket_id uuid not null references repair_tickets(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  notes text,
  checklist jsonb not null default '[]'::jsonb,
  logged_by uuid references users(id),
  logged_at timestamptz not null default now()
);

create index repair_diagnostics_ticket_idx on repair_diagnostics(repair_ticket_id);

create table repair_parts (
  id uuid primary key default gen_random_uuid(),
  repair_ticket_id uuid not null references repair_tickets(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  part_name text not null,
  cost numeric(12, 2),
  quantity integer not null default 1,
  status text not null default 'needed' check (status in ('needed', 'ordered', 'received', 'installed'))
);

create index repair_parts_ticket_idx on repair_parts(repair_ticket_id);

create table repair_ticket_status_history (
  id uuid primary key default gen_random_uuid(),
  repair_ticket_id uuid not null references repair_tickets(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  status_id uuid not null references workflow_statuses(id),
  changed_at timestamptz not null default now(),
  changed_by uuid references users(id),
  source text not null default 'live' check (source in ('live', 'manual_backfill')),
  note text
);

create index repair_ticket_status_history_ticket_idx on repair_ticket_status_history(repair_ticket_id, changed_at);

-- Row Level Security -----------------------------------------------------

alter table repair_tickets enable row level security;
alter table repair_diagnostics enable row level security;
alter table repair_parts enable row level security;
alter table repair_ticket_status_history enable row level security;

create policy repair_tickets_select on repair_tickets
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy repair_tickets_insert on repair_tickets
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy repair_tickets_update on repair_tickets
  for update to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));
create policy repair_tickets_delete on repair_tickets
  for delete to authenticated using (app_private.has_org_role(organization_id, array['owner', 'manager']));

create policy repair_diagnostics_select on repair_diagnostics
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy repair_diagnostics_write on repair_diagnostics
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy repair_parts_select on repair_parts
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy repair_parts_write on repair_parts
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy repair_ticket_status_history_select on repair_ticket_status_history
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy repair_ticket_status_history_insert on repair_ticket_status_history
  for insert to authenticated with check (app_private.is_org_member(organization_id));
