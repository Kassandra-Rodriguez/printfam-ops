import { NextResponse } from "next/server";
import { validatePortalToken } from "@/server/domain/portal/validatePortalToken";
import { checkPortalRateLimit, getRequestIp } from "@/server/domain/portal/rateLimit";
import { sendPortalMessage } from "@/server/domain/communications/sendPortalMessage";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

/**
 * docs/user_flows.md Flow J step 2 ("send a message"). Conversations only
 * link to order/repair_ticket (docs/data_model.md), so a quote/proof-scoped
 * token still gets to message — it just isn't filtered to that specific
 * quote/proof thread, same limitation the schema already has for staff-side
 * logging.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = getRequestIp(request);

  const withinIpLimit = await checkPortalRateLimit(`ip:${ip}:message`, 20, 60);
  if (!withinIpLimit) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const resolution = await validatePortalToken(token);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.reason }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.body !== "string") {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const supabase = createServiceRoleSupabaseClient();
  const result = await sendPortalMessage(supabase, resolution.organizationId, resolution.customerId, body.body, {
    orderId: resolution.scopeType === "order" ? resolution.scopeId : undefined,
    repairTicketId: resolution.scopeType === "repair_ticket" ? resolution.scopeId : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
