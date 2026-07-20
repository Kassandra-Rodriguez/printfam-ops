-- See docs/data_model.md "Customer portal" and docs/security.md #4 — this table is the
-- entire trust boundary for unauthenticated customer access. Only `token_hash` is ever
-- stored; the raw token exists only in the URL sent to the customer.
--
-- Deliberately NOT selectable/writable by the `authenticated` role via RLS: staff never
-- need to query this table through the client, and it is looked up exclusively by the
-- portal Route Handler using the service-role key after hashing the raw token from the
-- URL. This is the standard "server-only table" pattern — RLS is enabled with no
-- policies, which fails closed for every role except the service role (which bypasses
-- RLS entirely).

create table portal_access_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id),
  token_hash text not null unique,
  scope_type text not null check (scope_type in ('order', 'quote', 'proof', 'repair_ticket')),
  scope_id uuid not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create index portal_access_tokens_hash_idx on portal_access_tokens(token_hash);
create index portal_access_tokens_scope_idx on portal_access_tokens(scope_type, scope_id);

alter table portal_access_tokens enable row level security;
-- No policies: only the service role (which bypasses RLS) or a SECURITY DEFINER
-- function should ever touch this table. Staff can revoke a link through a dedicated
-- SECURITY DEFINER function (added alongside the portal feature in Phase 6/7) rather
-- than a direct table policy, so revocation stays auditable and intentional.
