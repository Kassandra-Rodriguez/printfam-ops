-- Phase 6 (docs/build_phases.md): rate limiting for the customer portal's
-- token-authenticated endpoints (docs/security.md #4.7, #8). No Redis/KV is
-- available in this environment (docs/architecture.md), so this is a small
-- Postgres-backed fixed-window counter — sufficient for a 1-3 person team's
-- traffic and consistent with "exact mechanism is an implementation detail"
-- per architecture.md #10.
--
-- Not selectable/writable by `authenticated` or `anon` — only the service
-- role (which the portal Route Handlers use, per docs/security.md #4) calls
-- check_portal_rate_limit(), same "server-only table" pattern as
-- portal_access_tokens in 0016_portal_tokens.sql.

create table portal_rate_limit_hits (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null,
  created_at timestamptz not null default now()
);

create index portal_rate_limit_hits_key_idx on portal_rate_limit_hits(bucket_key, created_at);

alter table portal_rate_limit_hits enable row level security;
-- No policies: service-role only, same reasoning as portal_access_tokens.

-- Records one hit for p_bucket_key (caller composes it, e.g. "token:<hash>"
-- or "ip:<addr>:<route>") and returns whether the caller is still within
-- p_max_hits over the trailing p_window_seconds. Opportunistically prunes
-- its own old rows so the table doesn't grow unbounded without a separate
-- cron job.
create or replace function check_portal_rate_limit(
  p_bucket_key text,
  p_max_hits integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Fixed 1-hour retention regardless of this call's window: callers can pass
  -- different p_window_seconds for different routes, and pruning by the
  -- *caller's* window would risk deleting rows another bucket still needs.
  delete from portal_rate_limit_hits where created_at < now() - interval '1 hour';

  insert into portal_rate_limit_hits (bucket_key) values (p_bucket_key);

  select count(*) into v_count
  from portal_rate_limit_hits
  where bucket_key = p_bucket_key
    and created_at >= now() - (p_window_seconds || ' seconds')::interval;

  return v_count <= p_max_hits;
end;
$$;

revoke all on function check_portal_rate_limit(text, integer, integer) from public;
-- Deliberately not granted to authenticated/anon — called exclusively via the
-- service-role client from portal Route Handlers (which bypasses grants).
