import { NextResponse } from "next/server";
import { validatePortalToken } from "@/server/domain/portal/validatePortalToken";
import { checkPortalRateLimit, getRequestIp } from "@/server/domain/portal/rateLimit";
import { createPortalCheckoutSession } from "@/server/domain/payments/createPortalCheckoutSession";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

/** Customer self-serve "Pay Now" — starts a Stripe Checkout session for the token's own order/repair balance. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = getRequestIp(request);

  const withinIpLimit = await checkPortalRateLimit(`ip:${ip}:checkout`, 10, 60);
  if (!withinIpLimit) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const resolution = await validatePortalToken(token);
  if (!resolution.ok) {
    return NextResponse.json({ error: resolution.reason }, { status: 403 });
  }
  if (resolution.scopeType !== "order" && resolution.scopeType !== "repair_ticket") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const returnUrl = `${origin}/portal/${token}`;

  const supabase = createServiceRoleSupabaseClient();
  const result = await createPortalCheckoutSession(
    supabase,
    resolution.organizationId,
    resolution.customerId,
    resolution.scopeType,
    resolution.scopeId,
    `${returnUrl}?payment=success`,
    `${returnUrl}?payment=cancelled`,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ url: result.url });
}
