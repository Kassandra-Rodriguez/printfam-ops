-- See docs/data_model.md "Activity & notifications" and docs/security.md #6.
-- `activity_logs` is append-only by policy: there is deliberately no update/delete
-- policy for any role, so even an Owner cannot rewrite history through the API.

create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_user_id uuid references users(id),
  actor_type text not null check (actor_type in ('user', 'customer', 'system')),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index activity_logs_org_entity_idx on activity_logs(organization_id, entity_type, entity_id);
create index activity_logs_org_occurred_idx on activity_logs(organization_id, occurred_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id),
  type text not null,
  entity_type text,
  entity_id uuid,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx on notifications(user_id, read_at);

-- Row Level Security -----------------------------------------------------

alter table activity_logs enable row level security;
alter table notifications enable row level security;

create policy activity_logs_select on activity_logs
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy activity_logs_insert on activity_logs
  for insert to authenticated with check (app_private.is_org_member(organization_id));
-- No update/delete policy anywhere in this table: append-only by design.

create policy notifications_select_own on notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_insert on notifications
  for insert to authenticated with check (app_private.is_org_member(organization_id));
create policy notifications_update_own on notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
