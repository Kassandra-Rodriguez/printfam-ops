import { NextResponse } from "next/server";
import { validatePortalToken } from "@/server/domain/portal/validatePortalToken";
import { checkPortalRateLimit, getRequestIp } from "@/server/domain/portal/rateLimit";
import { setRepairApproval } from "@/server/domain/repairs/setRepairApproval";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { notifyOrgMembers } from "@/server/data/notifications";

/**
 * docs/user_flows.md Flow D step 3 / Flow J — the portal-token path Phase 5
 * deliberately deferred (see setRepairApproval.ts's original comment).
 * `repairTicketId` is always `resolution.scopeId`, never anything from the
 * request body, so this can only ever touch the ticket the token was issued
 * for (docs/security.md #4.5).
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = getRequestIp(request);

  const withinIpLimit = await checkPortalRateLimit(`ip:${ip}:repair-approval`, 20, 60);
  if (!withinIpLimit) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const resolution = await validatePortalToken(token);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.reason }, { status: 403 });
  }
  if (resolution.scopeType !== "repair_ticket") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const supabase = createServiceRoleSupabaseClient();
  const result = await setRepairApproval(supabase, resolution.scopeId, true);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await notifyOrgMembers(supabase, resolution.organizationId, {
    type: "repair_approval_received",
    entityType: "repair_ticket",
    entityId: resolution.scopeId,
    message: "A customer approved a recommended repair",
  });

  return NextResponse.json({ ok: true });
}
