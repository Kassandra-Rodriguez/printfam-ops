import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getInventoryTriggerForStatus } from "@/server/data/workflow";
import { getCatalogProductOrderItems } from "@/server/data/orders";
import { recordInventoryTransaction, hasInventoryTransactionForOrder } from "@/server/data/products";

/**
 * docs/product_requirements.md §7.11: "inventory transactions logged on
 * configurable order-status triggers." Called from changeOrderStatus.ts
 * after the status write succeeds. Idempotent per (order, product, reason)
 * — an order revisiting the same trigger status (e.g. a manual correction)
 * must not double-decrement or double-restock.
 */
export async function applyInventoryTrigger(
  supabase: SupabaseClient,
  organizationId: string,
  orderId: string,
  targetStatusId: string,
): Promise<void> {
  const trigger = await getInventoryTriggerForStatus(supabase, targetStatusId);
  if (!trigger) return;

  const items = await getCatalogProductOrderItems(supabase, organizationId, orderId);
  if (items.length === 0) return;

  const reason = trigger === "decrement" ? "order_fulfillment" : "restock";
  const sign = trigger === "decrement" ? -1 : 1;

  for (const item of items) {
    const alreadyApplied = await hasInventoryTransactionForOrder(supabase, organizationId, orderId, item.productId, reason);
    if (alreadyApplied) continue;

    await recordInventoryTransaction(supabase, organizationId, {
      productId: item.productId,
      orderId,
      quantityDelta: sign * item.quantity,
      reason,
    });
  }
}
