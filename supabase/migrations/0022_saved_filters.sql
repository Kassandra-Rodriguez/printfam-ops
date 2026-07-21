-- docs/build_phases.md Phase 8: saved filters. Per-user, per-list-page —
-- there's no shared/team-visible saved filter concept in the source spec,
-- so this mirrors notifications' "own records only" RLS shape
-- (0014_activity_notifications.sql) rather than the org-wide read pattern
-- most other tables use.

create table saved_filters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  entity_type text not null,
  name text not null,
  filter_params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index saved_filters_user_entity_idx on saved_filters(user_id, entity_type);

alter table saved_filters enable row level security;

create policy saved_filters_select_own on saved_filters
  for select to authenticated using (user_id = auth.uid());
create policy saved_filters_insert_own on saved_filters
  for insert to authenticated with check (user_id = auth.uid() and app_private.is_org_member(organization_id));
create policy saved_filters_delete_own on saved_filters
  for delete to authenticated using (user_id = auth.uid());
