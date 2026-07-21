import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createOrderSchema, type CreateOrderInput } from "@/lib/validation/orders";
import { nextOrderNumber } from "@/server/data/orders";
import { insertPayment, recomputeOrderBalance } from "@/server/data/payments";
import { finalizeRequestConversion } from "@/server/domain/requests/convertRequestToOrder";
import { finalizeQuoteConversion } from "@/server/domain/quotes/finalizeQuoteConversion";
import { applyInventoryTrigger } from "./applyInventoryTrigger";

export type CreateOrderResult =
  | { status: "created"; orderId: string; orderNumber: string }
  | { status: "error"; error: string };

/**
 * Backs both Quick Entry and Detailed Entry (docs/user_flows.md Flow A) and the
 * mid-workflow "enter an order already in progress" path (Flow B) — the single
 * most important write path in the product per docs/product_requirements.md §8.
 *
 * Not wrapped in a database transaction: supabase-js doesn't expose one over
 * PostgREST, and a dedicated RPC felt like premature complexity for a 1-3
 * person team where a failure mid-sequence is rare and recoverable by editing
 * the order afterward. If this ever becomes a real problem, moving order
 * creation into a single SECURITY DEFINER function (like
 * create_organization_with_owner) is the fix — documented here rather than
 * silently accepted.
 */
export async function createOrder(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const items =
    data.items && data.items.length > 0
      ? data.items
      : [
          {
            description: data.title,
            quantity: 1,
            unitPrice: data.totalAmount ?? 0,
            itemType: "custom_line_item" as const,
          },
        ];

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal - data.discountTotal + data.taxTotal + data.shippingCost;

  const hasBackfill = Boolean(data.backfillStatuses && data.backfillStatuses.length > 0);
  const statusEntries = [
    ...(data.backfillStatuses ?? []),
    {
      statusId: data.statusId,
      changedAt: data.currentStatusReachedAt || new Date().toISOString(),
      note: undefined,
    },
  ];
  const currentStatusId = data.statusId;
  // A single, undated "current status" entry is a normal live transition; any
  // prior history (or an explicitly backdated "reached current status on")
  // means this order is being reconstructed, not created fresh.
  const historySource = hasBackfill || data.currentStatusReachedAt ? "manual_backfill" : "live";

  try {
    const orderNumber = await nextOrderNumber(supabase, organizationId);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        organization_id: organizationId,
        order_number: orderNumber,
        title: data.title,
        customer_id: data.customerId,
        order_type: data.orderType,
        requires_production: data.requiresProduction,
        source: data.source ?? null,
        status_id: currentStatusId,
        subtotal,
        discount_total: data.discountTotal,
        tax_total: data.taxTotal,
        shipping_cost: data.shippingCost,
        deposit_required: data.depositRequired,
        total,
        balance_remaining: total,
        promised_date: data.promisedDate || null,
        internal_deadline: data.internalDeadline || null,
        notes: data.notes || null,
        converted_from_request_id: data.convertedFromRequestId ?? null,
        created_by: userId,
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      console.error("createOrder: order insert failed:", orderError);
      return { status: "error", error: "Could not create the order. Try again." };
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        organization_id: organizationId,
        item_type: item.itemType,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        product_id: item.productId ?? null,
      })),
    );
    if (itemsError) {
      console.error("createOrder: items insert failed:", itemsError);
      return { status: "error", error: "Order was created, but its items failed to save." };
    }

    const { error: historyError } = await supabase.from("order_status_history").insert(
      statusEntries.map((entry) => ({
        order_id: order.id,
        organization_id: organizationId,
        status_id: entry.statusId,
        changed_at: entry.changedAt,
        changed_by: userId,
        source: historySource,
        note: entry.note || null,
      })),
    );
    if (historyError) {
      console.error("createOrder: status history insert failed:", historyError);
      return { status: "error", error: "Order was created, but its status history failed to save." };
    }

    // Mid-workflow entry (Flow B) can create an order already sitting at a
    // trigger status (e.g. "In Production") — the stock effect should apply
    // immediately, same as if the order had just transitioned there live.
    await applyInventoryTrigger(supabase, organizationId, order.id, currentStatusId);

    if (data.backfillPayments && data.backfillPayments.length > 0) {
      for (const payment of data.backfillPayments) {
        await insertPayment(supabase, {
          organizationId,
          customerId: data.customerId,
          orderId: order.id,
          amount: payment.amount,
          method: payment.method,
          kind: payment.kind,
          paidAt: payment.paidAt,
          referenceNumber: payment.referenceNumber,
          notes: payment.notes,
        });
      }
      await recomputeOrderBalance(supabase, order.id);
    }

    if (data.convertedFromRequestId) {
      await finalizeRequestConversion(supabase, organizationId, data.convertedFromRequestId, order.id);
    }
    if (data.convertedFromQuoteId) {
      await finalizeQuoteConversion(supabase, organizationId, data.convertedFromQuoteId, order.id);
    }

    return { status: "created", orderId: order.id, orderNumber: order.order_number };
  } catch (err) {
    console.error("createOrder failed:", err);
    return { status: "error", error: "Could not create the order. Try again." };
  }
}
