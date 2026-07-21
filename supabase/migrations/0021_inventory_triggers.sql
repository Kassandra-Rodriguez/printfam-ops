-- Phase 8 (docs/build_phases.md): "inventory transactions logged on
-- configurable order-status triggers" (docs/product_requirements.md §7.11).
-- The natural home for "which status does this" is the status row itself —
-- workflow_statuses already is the one place the app reads status lists
-- from (0003_workflow.sql) — rather than a separate mapping table.

alter table workflow_statuses
  add column inventory_trigger text check (inventory_trigger in ('decrement', 'restock'));

-- Seed sensible defaults for every org that already exists, mirroring the
-- product_requirements.md §7.11 example ("decrement on in production,
-- release reservation on cancellation"). New orgs get the same defaults via
-- the update to seed_default_workflows() below.
update workflow_statuses
set inventory_trigger = 'decrement'
where key = 'in_production'
  and workflow_definition_id in (select id from workflow_definitions where entity_type = 'order_custom');

update workflow_statuses
set inventory_trigger = 'decrement'
where key = 'preparing_order'
  and workflow_definition_id in (select id from workflow_definitions where entity_type = 'order_existing_product');

update workflow_statuses
set inventory_trigger = 'restock'
where key = 'cancelled'
  and workflow_definition_id in (
    select id from workflow_definitions where entity_type in ('order_custom', 'order_existing_product')
  );

-- Re-seed function so orgs created after this migration get the same
-- defaults without a second, drifting copy of the template — same
-- create-or-replace pattern 0003_workflow.sql already used for revisions.
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
      {"key": "in_production", "label": "In Production", "category": "info", "inventory_trigger": "decrement"},
      {"key": "quality_check", "label": "Quality Check", "category": "info"},
      {"key": "waiting_for_final_payment", "label": "Waiting for Final Payment", "category": "warning"},
      {"key": "ready_for_pickup", "label": "Ready for Pickup", "category": "success"},
      {"key": "ready_to_ship", "label": "Ready to Ship", "category": "success"},
      {"key": "shipped", "label": "Shipped", "category": "success"},
      {"key": "completed", "label": "Completed", "category": "success"},
      {"key": "cancelled", "label": "Cancelled", "category": "danger", "inventory_trigger": "restock"}
    ],
    "order_existing_product": [
      {"key": "order_received", "label": "Order Received", "category": "neutral"},
      {"key": "payment_pending", "label": "Payment Pending", "category": "warning"},
      {"key": "paid", "label": "Paid", "category": "success"},
      {"key": "preparing_order", "label": "Preparing Order", "category": "info", "inventory_trigger": "decrement"},
      {"key": "ready_for_pickup", "label": "Ready for Pickup", "category": "success"},
      {"key": "ready_to_ship", "label": "Ready to Ship", "category": "success"},
      {"key": "shipped", "label": "Shipped", "category": "success"},
      {"key": "completed", "label": "Completed", "category": "success"},
      {"key": "cancelled", "label": "Cancelled", "category": "danger", "inventory_trigger": "restock"}
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
      insert into workflow_statuses (workflow_definition_id, organization_id, key, label, sort_order, category, color, inventory_trigger)
      values (
        v_definition_id,
        p_organization_id,
        v_status ->> 'key',
        v_status ->> 'label',
        v_sort_order,
        v_status ->> 'category',
        v_status ->> 'category',
        v_status ->> 'inventory_trigger'
      );
      v_sort_order := v_sort_order + 1;
    end loop;
  end loop;
end;
$$;

revoke all on function seed_default_workflows(uuid) from public;
