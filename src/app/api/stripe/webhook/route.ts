import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";
import { insertPayment, recomputeOrderBalance, recomputeRepairBalance } from "@/server/data/payments";
import { notifyOrgMembers } from "@/server/data/notifications";

/**
 * Stripe calls this directly (no browser session, no portal token) — the
 * webhook signature, verified against STRIPE_WEBHOOK_SECRET, is the entire
 * trust boundary here, same role the portal token plays elsewhere
 * (docs/security.md #4's pattern applied to a different kind of caller).
 * Must read the raw body *before* any JSON parsing — Stripe signs the exact
 * bytes it sent, and re-serializing a parsed object won't match.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("stripe webhook: STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("stripe webhook: signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ok: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const { organizationId, customerId, scopeType, scopeId, amount } = session.metadata ?? {};
  if (!organizationId || !customerId || !scopeType || !scopeId || !amount) {
    console.error("stripe webhook: checkout.session.completed missing expected metadata", session.id);
    return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }

  const supabase = createServiceRoleSupabaseClient();

  // Idempotent: Stripe retries webhook delivery on anything but a fast 2xx,
  // so a session whose payment we've already recorded must be a no-op, not
  // a duplicate payment.
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("reference_number", session.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true });
  }

  try {
    await insertPayment(supabase, {
      organizationId,
      customerId,
      orderId: scopeType === "order" ? scopeId : undefined,
      repairTicketId: scopeType === "repair_ticket" ? scopeId : undefined,
      amount: Number(amount),
      method: "card",
      kind: "final",
      paidAt: new Date().toISOString().slice(0, 10),
      referenceNumber: session.id,
      notes: "Paid by customer via the portal (Stripe)",
    });

    if (scopeType === "order") {
      await recomputeOrderBalance(supabase, scopeId);
    } else {
      await recomputeRepairBalance(supabase, scopeId);
    }

    await notifyOrgMembers(supabase, organizationId, {
      type: "payment_recorded",
      entityType: scopeType,
      entityId: scopeId,
      message: `Customer paid $${amount} online`,
    });
  } catch (err) {
    console.error("stripe webhook: failed to record payment for session", session.id, err);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
