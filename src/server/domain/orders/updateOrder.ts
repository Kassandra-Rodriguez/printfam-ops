import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateOrderSchema, type UpdateOrderInput } from "@/lib/validation/orders";
import { updateOrderFields, replaceOrderItems } from "@/server/data/orders";
import { recomputeOrderBalance } from "@/server/data/payments";

export type UpdateOrderResult = { ok: true } | { ok: false; error: string };

/**
 * Edits everything about an order *except* status (the detail page's status
 * control is the only path that writes order_status_history — see
 * docs/lib/validation/orders.ts's updateOrderSchema comment) and payments.
 * Recomputes subtotal/total from the edited items and, since total can
 * change, re-runs recomputeOrderBalance so balance_remaining stays correct
 * against whatever payments already exist — the same function
 * recordOrderPayment.ts uses, so there's exactly one place that math lives.
 */
export async function updateOrder(
  supabase: SupabaseClient,
  organizationId: string,
  input: UpdateOrderInput,
): Promise<UpdateOrderResult> {
  const parsed = updateOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal - data.discountTotal + data.taxTotal + data.shippingCost;

  try {
    await updateOrderFields(supabase, data.orderId, {
      customerId: data.customerId,
      title: data.title,
      subtotal,
      total,
      promisedDate: data.promisedDate,
      internalDeadline: data.internalDeadline,
      notes: data.notes,
      discountTotal: data.discountTotal,
      taxTotal: data.taxTotal,
      shippingCost: data.shippingCost,
      depositRequired: data.depositRequired,
      source: data.source,
    });
    await replaceOrderItems(supabase, organizationId, data.orderId, data.items);
    await recomputeOrderBalance(supabase, data.orderId);
    return { ok: true };
  } catch (err) {
    console.error("updateOrder failed:", err);
    return { ok: false, error: "Could not save changes. Try again." };
  }
}
