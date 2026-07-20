-- Configurable status engine. See docs/data_model.md "workflow_definitions" /
-- "workflow_statuses" and docs/architecture.md #5 — the UI reads these tables for every
-- status dropdown/board/badge; no status string is ever hardcoded in application code.
--
-- Reconciles docs/product_requirements.md §10.2: a `bulk` order does not get its own
-- workflow_definition. At order-creation time it resolves to either the `order_custom`
-- or `order_existing_product` workflow via `requires_production`, so entity_type below
-- covers exactly the workflows that exist, not every orders.order_type value.

create table workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null check (
    entity_type in ('request', 'order_custom', 'order_existing_product', 'order_service', 'repair_ticket', 'quote')
  ),
  name text not null,
  is_default boolean not null default true,
  unique (organization_id, entity_type)
);

create table workflow_statuses (
  id uuid primary key default gen_random_uuid(),
  workflow_definition_id uuid not null references workflow_definitions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  key text not null,
  label text not null,
  sort_order integer not null,
  category text not null check (category in ('neutral', 'info', 'warning', 'danger', 'success')),
  color text not null,
  unique (workflow_definition_id, key)
);

create index workflow_statuses_definition_idx on workflow_statuses(workflow_definition_id, sort_order);

-- Maps orders.order_type + requires_production to the workflow entity_type that governs
-- its status list. Called by the order-creation domain function, not by application code
-- directly picking a workflow_definition_id.
create or replace function resolve_order_workflow_entity_type(p_order_type text, p_requires_production boolean)
returns text
language sql
immutable
as $$
  select case
    when p_order_type = 'custom' then 'order_custom'
    when p_order_type = 'existing_product' then 'order_existing_product'
    when p_order_type = 'service' then 'order_service'
    when p_order_type = 'bulk' and p_requires_production then 'order_custom'
    when p_order_type = 'bulk' and not p_requires_production then 'order_existing_product'
    else null
  end;
$$;

-- Seeds the exact status vocabularies from docs/product_requirements.md §9 for a new
-- organization. Editing them per-org is a Phase 8 Settings UI (docs/build_phases.md);
-- this function only establishes the defaults every org starts with.
create or replace function seed_default_workflows(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_templates jsonb := $j${
    "request": [
      {"key": "new", "label": "New", "category": "neutral"},
      {"key": "reviewing", "label": "Reviewing", "category": "info"},
      {"key": "waiting_for_customer", "label": "Waiting for Customer", "category": "warning"},
      {"key": "quote_needed", "label": "Quote Needed", "category": "warning"},
      {"key": "quote_sent", "label": "Quote Sent", "category": "warning"},
      {"key": "follow_up_needed", "label": "Follow Up Needed", "category": "warning"},
      {"key": "approved", "label": "Approved", "category": "success"},
      {"key": "converted_to_order", "label": "Converted to Order", "category": "success"},
      {"key": "declined", "label": "Declined", "category": "danger"},
      {"key": "lost", "label": "Lost", "category": "danger"},
      {"key": "archived", "label": "Archived", "category": "neutral"}
    ],
    "order_custom": [
      {"key": "request_received", "label": "Request Received", "category": "neutral"},
      {"key": "gathering_details", "label": "Gathering Details", "category": "info"},
      {"key": "quote_needed", "label": "Quote Needed", "category": "warning"},
      {"key": "quote_sent", "label": "Quote Sent", "category": "warning"},
      {"key": "waiting_for_deposit", "label": "Waiting for Deposit", "category": "warning"},
      {"key": "design_in_progress", "label": "Design in Progress", "category": "info"},
      {"key": "proof_sent", "label": "Proof Sent", "category": "warning"},
      {"key": "revision_requested", "label": "Revision Requested", "category": "warning"},
      {"key": "customer_approved", "label": "Customer Approved", "category": "success"},
      {"key": "production_queued", "label": "Production Queued", "category": "info"},
      {"key": "in_production", "label": "In Production", "category": "info"},
      {"key": "quality_check", "label": "Quality Check", "category": "info"},
      {"key": "waiting_for_final_payment", "label": "Waiting for Final Payment", "category": "warning"},
      {"key": "ready_for_pickup", "label": "Ready for Pickup", "category": "success"},
      {"key": "ready_to_ship", "label": "Ready to Ship", "category": "success"},
      {"key": "shipped", "label": "Shipped", "category": "success"},
      {"key": "completed", "label": "Completed", "category": "success"},
      {"key": "cancelled", "label": "Cancelled", "category": "danger"}
    ],
    "order_existing_product": [
      {"key": "order_received", "label": "Order Received", "category": "neutral"},
      {"key": "payment_pending", "label": "Payment Pending", "category": "warning"},
      {"key": "paid", "label": "Paid", "category": "success"},
      {"key": "preparing_order", "label": "Preparing Order", "category": "info"},
      {"key": "ready_for_pickup", "label": "Ready for Pickup", "category": "success"},
      {"key": "ready_to_ship", "label": "Ready to Ship", "category": "success"},
      {"key": "shipped", "label": "Shipped", "category": "success"},
      {"key": "completed", "label": "Completed", "category": "success"},
      {"key": "cancelled", "label": "Cancelled", "category": "danger"}
    ],
    "order_service": [
      {"key": "requested", "label": "Requested", "category": "neutral"},
      {"key": "scheduled", "label": "Scheduled", "category": "info"},
      {"key": "in_progress", "label": "In Progress", "category": "info"},
      {"key": "waiting_for_payment", "label": "Waiting for Payment", "category": "warning"},
      {"key": "completed", "label": "Completed", "category": "success"},
      {"key": "cancelled", "label": "Cancelled", "category": "danger"}
    ],
    "repair_ticket": [
      {"key": "repair_requested", "label": "Repair Requested", "category": "neutral"},
      {"key": "awaiting_drop_off", "label": "Awaiting Drop Off", "category": "warning"},
      {"key": "device_received", "label": "Device Received", "category": "info"},
      {"key": "diagnostic_in_progress", "label": "Diagnostic in Progress", "category": "info"},
      {"key": "waiting_for_customer_approval", "label": "Waiting for Customer Approval", "category": "warning"},
      {"key": "waiting_for_parts", "label": "Waiting for Parts", "category": "warning"},
      {"key": "repair_in_progress", "label": "Repair in Progress", "category": "info"},
      {"key": "testing", "label": "Testing", "category": "info"},
      {"key": "repair_completed", "label": "Repair Completed", "category": "success"},
      {"key": "waiting_for_payment", "label": "Waiting for Payment", "category": "warning"},
      {"key": "ready_for_pickup", "label": "Ready for Pickup", "category": "success"},
      {"key": "returned_to_customer", "label": "Returned to Customer", "category": "success"},
      {"key": "closed", "label": "Closed", "category": "success"},
      {"key": "cancelled", "label": "Cancelled", "category": "danger"}
    ],
    "quote": [
      {"key": "draft", "label": "Draft", "category": "neutral"},
      {"key": "sent", "label": "Sent", "category": "warning"},
      {"key": "viewed", "label": "Viewed", "category": "warning"},
      {"key": "approved", "label": "Approved", "category": "success"},
      {"key": "declined", "label": "Declined", "category": "danger"},
      {"key": "expired", "label": "Expired", "category": "danger"},
      {"key": "converted_to_order", "label": "Converted to Order", "category": "success"}
    ]
  }$j$::jsonb;
  v_entity_type text;
  v_statuses jsonb;
  v_status jsonb;
  v_definition_id uuid;
  v_sort_order integer;
begin
  for v_entity_type, v_statuses in select * from jsonb_each(v_templates)
  loop
    insert into workflow_definitions (organization_id, entity_type, name, is_default)
    values (p_organization_id, v_entity_type, initcap(replace(v_entity_type, '_', ' ')), true)
    returning id into v_definition_id;

    v_sort_order := 0;
    for v_status in select * from jsonb_array_elements(v_statuses)
    loop
      insert into workflow_statuses (workflow_definition_id, organization_id, key, label, sort_order, category, color)
      values (
        v_definition_id,
        p_organization_id,
        v_status ->> 'key',
        v_status ->> 'label',
        v_sort_order,
        v_status ->> 'category',
        v_status ->> 'category'
      );
      v_sort_order := v_sort_order + 1;
    end loop;
  end loop;
end;
$$;

revoke all on function seed_default_workflows(uuid) from public;

-- Row Level Security -----------------------------------------------------

alter table workflow_definitions enable row level security;
alter table workflow_statuses enable row level security;

create policy workflow_definitions_select on workflow_definitions
  for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy workflow_definitions_write_owner on workflow_definitions
  for all to authenticated
  using (app_private.has_org_role(organization_id, array['owner']))
  with check (app_private.has_org_role(organization_id, array['owner']));

create policy workflow_statuses_select on workflow_statuses
  for select to authenticated
  using (app_private.is_org_member(organization_id));

create policy workflow_statuses_write_owner on workflow_statuses
  for all to authenticated
  using (app_private.has_org_role(organization_id, array['owner']))
  with check (app_private.has_org_role(organization_id, array['owner']));
