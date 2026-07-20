-- Fixes a real bug found testing order creation against a live project:
-- next_sequence_value() was created in app_private, which PostgREST doesn't expose,
-- so supabase.rpc("next_sequence_value", ...) from server/data/orders.ts could never
-- reach it — order creation failed with a generic "could not create the order" error
-- while the real cause (PGRST202, function not found in schema cache) never surfaced.
--
-- 0001_setup.sql has been corrected in place for fresh installs (new local/hosted
-- projects created from scratch won't hit this). This migration carries the same fix
-- forward to databases where the broken version already ran.

drop function if exists app_private.next_sequence_value(uuid, text);

create or replace function next_sequence_value(p_organization_id uuid, p_sequence_key text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value bigint;
begin
  insert into app_private.org_sequence_counters (organization_id, sequence_key, next_value)
  values (p_organization_id, p_sequence_key, 2)
  on conflict (organization_id, sequence_key)
  do update set next_value = app_private.org_sequence_counters.next_value + 1
  returning next_value - 1 into v_value;
  return v_value;
end;
$$;

revoke all on function next_sequence_value(uuid, text) from public;
grant execute on function next_sequence_value(uuid, text) to authenticated;
