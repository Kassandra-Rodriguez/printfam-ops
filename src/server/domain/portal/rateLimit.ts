import "server-only";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

/**
 * docs/security.md #4.7/#8: covers token brute-forcing and write-endpoint
 * abuse on the unauthenticated portal. Backed by the Postgres function in
 * 0020_portal_rate_limit.sql — see that migration for why it's SQL-based
 * (no Redis/KV in this environment) rather than an edge middleware.
 */
export async function checkPortalRateLimit(
  bucketKey: string,
  maxHits: number,
  windowSeconds: number,
): Promise<boolean> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase.rpc("check_portal_rate_limit", {
    p_bucket_key: bucketKey,
    p_max_hits: maxHits,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return data === true;
}

/** IP, when available behind Vercel's proxy — falls back to "unknown" (still bucketed together, degrading to a shared limit rather than no limit). */
export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
