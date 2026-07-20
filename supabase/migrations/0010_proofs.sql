-- See docs/data_model.md "Proofs" and docs/user_flows.md Flow F.
-- `file_attachment_id` FK is added in 0012_files.sql once `attachments` exists.

create table proofs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid references orders(id),
  repair_ticket_id uuid references repair_tickets(id),
  title text not null,
  approval_required boolean not null default true,
  visibility text not null default 'internal_only' check (visibility in ('internal_only', 'customer_visible')),
  latest_status text not null default 'draft' check (latest_status in ('draft', 'sent', 'approved', 'revision_requested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  constraint proofs_target_chk check (
    (case when order_id is not null then 1 else 0 end)
    + (case when repair_ticket_id is not null then 1 else 0 end) = 1
  )
);

create index proofs_org_order_idx on proofs(organization_id, order_id);
create index proofs_org_repair_idx on proofs(organization_id, repair_ticket_id);

create trigger proofs_set_updated_at
  before update on proofs
  for each row execute function app_private.set_updated_at();

create table proof_versions (
  id uuid primary key default gen_random_uuid(),
  proof_id uuid not null references proofs(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  version_number integer not null,
  file_attachment_id uuid,
  customer_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (proof_id, version_number)
);

create index proof_versions_proof_idx on proof_versions(proof_id, version_number);

create table proof_responses (
  id uuid primary key default gen_random_uuid(),
  proof_version_id uuid not null references proof_versions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  response text not null check (response in ('approved', 'revision_requested')),
  revision_comment text,
  responded_at timestamptz not null default now(),
  responded_via text not null check (responded_via in ('portal', 'staff_relayed')),
  constraint proof_responses_revision_comment_chk check (
    response <> 'revision_requested' or revision_comment is not null
  )
);

create index proof_responses_version_idx on proof_responses(proof_version_id);

-- Row Level Security -----------------------------------------------------
-- Customer-portal writes to proof_responses happen through a service-role-backed
-- Route Handler after independent token validation (docs/security.md #4), not through
-- these authenticated-role policies — a portal visitor is never a Supabase Auth user.

alter table proofs enable row level security;
alter table proof_versions enable row level security;
alter table proof_responses enable row level security;

create policy proofs_select on proofs
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy proofs_write on proofs
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy proof_versions_select on proof_versions
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy proof_versions_write on proof_versions
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));

create policy proof_responses_select on proof_responses
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy proof_responses_insert on proof_responses
  for insert to authenticated with check (app_private.is_org_member(organization_id));
