import { NextResponse } from "next/server";
import { validatePortalToken } from "@/server/domain/portal/validatePortalToken";
import { checkPortalRateLimit, getRequestIp } from "@/server/domain/portal/rateLimit";
import { recordQuoteResponse } from "@/server/domain/quotes/recordQuoteResponse";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { notifyOrgMembers } from "@/server/data/notifications";

/**
 * docs/user_flows.md Flow E step 4 / Flow J, docs/security.md #4. Route
 * Handler (not a Server Action) because the customer has no Supabase
 * session — the token is the only trust boundary — per architecture.md #10.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = getRequestIp(request);

  const withinIpLimit = await checkPortalRateLimit(`ip:${ip}:quote-response`, 30, 60);
  if (!withinIpLimit) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const resolution = await validatePortalToken(token);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.reason }, { status: 403 });
  }
  if (resolution.scopeType !== "quote") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const response = body?.response;
  if (response !== "approved" && response !== "declined") {
    return NextResponse.json({ error: "Invalid response" }, { status: 400 });
  }
  const declineReason = typeof body?.declineReason === "string" ? body.declineReason : undefined;

  const supabase = createServiceRoleSupabaseClient();
  const result = await recordQuoteResponse(
    supabase,
    resolution.organizationId,
    resolution.scopeId,
    response,
    declineReason,
    { type: "customer" },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  await notifyOrgMembers(supabase, resolution.organizationId, {
    type: response === "approved" ? "quote_approved" : "quote_declined",
    entityType: "quote",
    entityId: resolution.scopeId,
    message: `A customer ${response} their quote`,
  });

  return NextResponse.json({ ok: true });
}
