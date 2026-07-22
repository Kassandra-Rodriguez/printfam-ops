import "server-only";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { generatePortalToken, PORTAL_TOKEN_DEFAULT_EXPIRY_DAYS } from "./token";

export type PortalScopeType = "order" | "quote" | "proof" | "repair_ticket";

/**
 * portal_access_tokens has no RLS policies (0016_portal_tokens.sql) — it's a
 * server-only table by design, so every read/write here goes through the
 * service-role client rather than the caller's session-scoped one, even
 * though this is invoked from staff-authenticated Server Actions (send
 * quote/proof). Kept as plain TS rather than a SQL SECURITY DEFINER function
 * so it lives alongside the rest of the domain layer instead of splitting
 * the same logic across two languages.
 */
export async function issuePortalToken(
  organizationId: string,
  customerId: string,
  scopeType: PortalScopeType,
  scopeId: string,
  createdBy: string,
  expiresInDays: number = PORTAL_TOKEN_DEFAULT_EXPIRY_DAYS,
  forceReissue: boolean = false,
): Promise<{ reused: true } | { reused: false; rawToken: string }> {
  const supabase = createServiceRoleSupabaseClient();

  // Flow F step 2 / Flow E step 2: "generates/reuses a portal token." A
  // still-valid token for this exact scope means the customer's existing
  // link keeps working (the portal always renders current state for that
  // scope), so there's nothing new to send — unless the caller explicitly
  // wants a fresh, copyable link (forceReissue): the raw value is never
  // stored (docs/security.md #4.2), so "let staff copy the link again"
  // after the first display can only mean issuing a new one, which
  // supersedes whatever was shown before.
  if (!forceReissue) {
    const { data: existing, error: existingError } = await supabase
      .from("portal_access_tokens")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("scope_type", scopeType)
      .eq("scope_id", scopeId)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      return { reused: true };
    }
  } else {
    await revokePortalTokensForScope(organizationId, scopeType, scopeId);
  }

  const { raw, hash } = generatePortalToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase.from("portal_access_tokens").insert({
    organization_id: organizationId,
    customer_id: customerId,
    token_hash: hash,
    scope_type: scopeType,
    scope_id: scopeId,
    expires_at: expiresAt,
    created_by: createdBy,
  });
  if (insertError) throw insertError;

  return { reused: false, rawToken: raw };
}

/** docs/security.md #4.4 — lets staff invalidate a link immediately. */
export async function revokePortalTokensForScope(
  organizationId: string,
  scopeType: PortalScopeType,
  scopeId: string,
): Promise<void> {
  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase
    .from("portal_access_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("scope_type", scopeType)
    .eq("scope_id", scopeId)
    .is("revoked_at", null);
  if (error) throw error;
}
