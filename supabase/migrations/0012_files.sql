-- See docs/data_model.md "Files". A single generic table via explicit nullable FKs
-- rather than a polymorphic (type, id) pair, per docs/product_requirements.md §10.4 and
-- docs/architecture.md — keeps referential integrity and RLS simple.

create table attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id),
  request_id uuid references requests(id),
  order_id uuid references orders(id),
  repair_ticket_id uuid references repair_tickets(id),
  message_id uuid references messages(id),
  quote_id uuid references quotes(id),
  proof_version_id uuid references proof_versions(id),
  product_id uuid references products(id),
  file_name text not null,
  file_type text not null,
  storage_path text not null,
  visibility text not null default 'internal_only' check (visibility in ('internal_only', 'customer_visible')),
  description text,
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now(),
  constraint attachments_relation_chk check (
    customer_id is not null or request_id is not null or order_id is not null
    or repair_ticket_id is not null or message_id is not null or quote_id is not null
    or proof_version_id is not null or product_id is not null
  )
);

create index attachments_org_order_idx on attachments(organization_id, order_id);
create index attachments_org_customer_idx on attachments(organization_id, customer_id);
create index attachments_org_repair_idx on attachments(organization_id, repair_ticket_id);
create index attachments_org_proof_version_idx on attachments(organization_id, proof_version_id);

alter table order_items
  add constraint order_items_reference_image_attachment_id_fkey
  foreign key (reference_image_attachment_id) references attachments(id);

alter table proof_versions
  add constraint proof_versions_file_attachment_id_fkey
  foreign key (file_attachment_id) references attachments(id);

alter table payments
  add constraint payments_receipt_attachment_id_fkey
  foreign key (receipt_attachment_id) references attachments(id);

-- Row Level Security -----------------------------------------------------
-- Table-row visibility here is the tenant boundary only. The `visibility` column is
-- enforced at the signed-URL issuance layer for portal requests (docs/security.md #5) —
-- a staff member reading this table sees every row regardless of visibility, which is
-- correct; the portal never queries this table directly, it goes through a Route Handler
-- that checks both the token's scope and `visibility = 'customer_visible'`.

alter table attachments enable row level security;

create policy attachments_select on attachments
  for select to authenticated using (app_private.is_org_member(organization_id));
create policy attachments_write on attachments
  for all to authenticated using (app_private.is_org_member(organization_id)) with check (app_private.is_org_member(organization_id));
