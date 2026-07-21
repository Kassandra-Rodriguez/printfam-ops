import "server-only";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { hashPortalToken } from "./token";
import type { PortalScopeType } from "./issuePortalToken";

export type PortalTokenResolution =
  | {
      ok: true;
      tokenId: string;
      organizationId: string;
      customerId: string;
      scopeType: PortalScopeType;
      scopeId: string;
    }
  | { ok: false; reason: "not_found" | "expired" | "revoked" };

/**
 * The entire trust boundary for unauthenticated portal access
 * (docs/security.md #4). Every subsequent query in a portal request must be
 * scoped using the `organizationId`/`scopeId` this returns — never an id the
 * client supplied in the URL — to prevent IDOR (#4.5).
 */
export async function validatePortalToken(rawToken: string): Promise<PortalTokenResolution> {
  const supabase = createServiceRoleSupabaseClient();
  const hash = hashPortalToken(rawToken);

  const { data, error } = await supabase
    .from("portal_access_tokens")
    .select("id, organization_id, customer_id, scope_type, scope_id, expires_at, revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error) throw error;

  if (!data) return { ok: false, reason: "not_found" };
  if (data.revoked_at) return { ok: false, reason: "revoked" };
  if (new Date(data.expires_at).getTime() <= Date.now()) return { ok: false, reason: "expired" };

  await supabase
    .from("portal_access_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    ok: true,
    tokenId: data.id,
    organizationId: data.organization_id,
    customerId: data.customer_id,
    scopeType: data.scope_type as PortalScopeType,
    scopeId: data.scope_id,
  };
}
