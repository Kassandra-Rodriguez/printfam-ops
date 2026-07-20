-- See docs/data_model.md "Integrations & configuration" and docs/architecture.md #6.
-- `status` only ever holds 'not_connected' in v1 — there is no live provider yet, per
-- the explicit "do not build fake integrations" requirement. This table exists so the
-- Settings screen can render an honest "Instagram — Not Connected" row today.

create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null check (
    provider in ('shopify', 'tiktok_shop', 'instagram', 'gmail', 'sms', 'messenger', 'whatsapp')
  ),
  status text not null default 'not_connected' check (status = 'not_connected'),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create trigger integration_connections_set_updated_at
  before update on integration_connections
  for each row execute function app_private.set_updated_at();

-- Row Level Security -----------------------------------------------------

alter table integration_connections enable row level security;

create policy integration_connections_select on integration_connections
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy integration_connections_write_owner on integration_connections
  for all to authenticated using (app_private.has_org_role(organization_id, array['owner']))
  with check (app_private.has_org_role(organization_id, array['owner']));
