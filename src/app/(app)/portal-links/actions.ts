"use server";

import { requireOrgContext } from "@/server/authz/session";
import { issuePortalToken, type PortalScopeType } from "@/server/domain/portal/issuePortalToken";

/** Phase 7: staff-initiated "Share portal link" for an order or repair ticket — same issuance path Phase 6 used for quotes/proofs. */
export async function issuePortalLinkAction(
  scopeType: PortalScopeType,
  scopeId: string,
  customerId: string,
): Promise<{ ok: true; portalPath: string | null } | { ok: false; error: string }> {
  const ctx = await requireOrgContext();
  try {
    const issued = await issuePortalToken(
      ctx.activeMembership.organization_id,
      customerId,
      scopeType,
      scopeId,
      ctx.userId,
    );
    return { ok: true, portalPath: issued.reused ? null : `/portal/${issued.rawToken}` };
  } catch (err) {
    console.error("issuePortalLinkAction failed:", err);
    return { ok: false, error: "Could not create a portal link. Try again." };
  }
}
