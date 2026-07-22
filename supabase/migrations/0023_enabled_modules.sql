-- Configurable feature modules: not every business using this product needs
-- Repairs, Quotes, or Inventory — this lets an Owner turn them off per
-- organization rather than the app assuming every tenant is a print shop.
-- Core modules (customers, orders, requests, tasks, communications,
-- dashboard, settings) are never optional. `organizations_update_owner`
-- (0002_tenancy.sql) already restricts writes to the Owner role, so no new
-- RLS policy is needed here.

alter table organizations
  add column enabled_modules jsonb not null default '["repairs", "quotes", "inventory"]'::jsonb;
