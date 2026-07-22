import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripeClient } from "@/lib/stripe";
import { getOrderForPortal, getRepairTicketForPortal } from "@/server/data/portalViews";

export type CreatePortalCheckoutSessionResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * The customer pays their own balance from the portal (Stripe Checkout,
 * hosted/redirect flow — card data never touches this app's server, so
 * there's no PCI scope to manage). Staff-entered cash/other payments still
 * go through the existing recordOrderPayment/recordRepairPayment path
 * unchanged; this is the self-serve complement to that, not a replacement.
 */
export async function createPortalCheckoutSession(
  supabase: SupabaseClient,
  organizationId: string,
  customerId: string,
  scopeType: "order" | "repair_ticket",
  scopeId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<CreatePortalCheckoutSessionResult> {
  let amountOwed: number;
  let description: string;

  if (scopeType === "order") {
    const order = await getOrderForPortal(supabase, organizationId, scopeId);
    if (!order) return { ok: false, error: "Order not found" };
    amountOwed = order.balance_remaining;
    description = order.title ?? order.order_number;
  } else {
    const ticket = await getRepairTicketForPortal(supabase, organizationId, scopeId);
    if (!ticket) return { ok: false, error: "Repair ticket not found" };
    amountOwed = ticket.final_balance;
    description = ticket.device_model;
  }

  if (amountOwed <= 0) {
    return { ok: false, error: "There's no balance due." };
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amountOwed * 100),
            product_data: { name: `Payment — ${description}` },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
        customerId,
        scopeType,
        scopeId,
        amount: amountOwed.toFixed(2),
      },
    });

    if (!session.url) {
      return { ok: false, error: "Could not start checkout. Try again." };
    }
    return { ok: true, url: session.url };
  } catch (err) {
    console.error("createPortalCheckoutSession failed:", err);
    return { ok: false, error: "Could not start checkout. Try again." };
  }
}
