"use server";

import { requireOrgContext } from "@/server/authz/session";
import { issuePortalToken, type PortalScopeType } from "@/server/domain/portal/issuePortalToken";

/**
 * Phase 7: staff-initiated "Share portal link" for an order or repair
 * ticket — same issuance path Phase 6 used for quotes/proofs.
 * `forceReissue` always true: the raw token is never stored
 * (docs/security.md #4.2), so this is the owner's only way to get a
 * copyable link again after the first display — a fresh link that
 * supersedes any previously shown one, not a retrieval of the old value.
 */
export async function issuePortalLinkAction(
  scopeType: PortalScopeType,
  scopeId: string,
  customerId: string,
): Promise<{ ok: true; portalPath: string } | { ok: false; error: string }> {
  const ctx = await requireOrgContext();
  try {
    const issued = await issuePortalToken(
      ctx.activeMembership.organization_id,
      customerId,
      scopeType,
      scopeId,
      ctx.userId,
      undefined,
      true,
    );
    if (issued.reused) {
      // Unreachable with forceReissue: true, but keeps the return type honest.
      return { ok: false, error: "Could not create a portal link. Try again." };
    }
    return { ok: true, portalPath: `/portal/${issued.rawToken}` };
  } catch (err) {
    console.error("issuePortalLinkAction failed:", err);
    return { ok: false, error: "Could not create a portal link. Try again." };
  }
}
