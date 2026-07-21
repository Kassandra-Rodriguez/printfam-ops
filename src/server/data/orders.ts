import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusCategory } from "./workflow";

export type OrderListRow = {
  id: string;
  order_number: string;
  title: string | null;
  order_type: string;
  promised_date: string | null;
  total: number;
  balance_remaining: number;
  created_at: string;
  customer: { id: string; display_name: string } | null;
  status: { id: string; key: string; label: string; category: StatusCategory } | null;
};

const ORDER_LIST_SELECT =
  "id, order_number, title, order_type, promised_date, total, balance_remaining, created_at, " +
  "customer:customers(id, display_name), status:workflow_statuses(id, key, label, category)";

export async function listOrders(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrderListRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_LIST_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as OrderListRow[];
}

export async function listOrdersForCustomer(
  supabase: SupabaseClient,
  organizationId: string,
  customerId: string,
): Promise<OrderListRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_LIST_SELECT)
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as OrderListRow[];
}

export async function getOrder(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
       customer:customers(id, display_name, phone, email),
       status:workflow_statuses(id, key, label, category),
       order_items(*),
       order_status_history(id, changed_at, source, note, status:workflow_statuses(label, category)),
       payments(id, amount, method, kind, paid_at, reference_number, notes, created_at),
       tasks(id, title, status, due_date, priority, assigned_user_id, order_id, customer_id),
       conversations(id, channel, messages(id, body, direction, occurred_at))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function nextOrderNumber(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("next_sequence_value", {
    p_organization_id: organizationId,
    p_sequence_key: "order",
  });
  if (error) throw error;
  return `ORD-${data}`;
}

export async function updateOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  statusId: string,
) {
  const { error } = await supabase.from("orders").update({ status_id: statusId }).eq("id", orderId);
  if (error) throw error;
}

export async function updateOrderFields(
  supabase: SupabaseClient,
  orderId: string,
  fields: {
    customerId: string;
    title: string;
    subtotal: number;
    total: number;
    promisedDate?: string;
    internalDeadline?: string;
    notes?: string;
    discountTotal: number;
    taxTotal: number;
    shippingCost: number;
    depositRequired: number;
    source?: string;
  },
) {
  const { error } = await supabase
    .from("orders")
    .update({
      customer_id: fields.customerId,
      title: fields.title,
      subtotal: fields.subtotal,
      total: fields.total,
      promised_date: fields.promisedDate || null,
      internal_deadline: fields.internalDeadline || null,
      notes: fields.notes || null,
      discount_total: fields.discountTotal,
      tax_total: fields.taxTotal,
      shipping_cost: fields.shippingCost,
      deposit_required: fields.depositRequired,
      source: fields.source ?? null,
    })
    .eq("id", orderId);
  if (error) throw error;
}

/**
 * Replaces every line item wholesale rather than diffing — an order rarely
 * has more than a handful of items, and "delete all, insert the current set"
 * is simpler and less error-prone than reconciling adds/edits/removes by id.
 */
export async function replaceOrderItems(
  supabase: SupabaseClient,
  organizationId: string,
  orderId: string,
  items: { description: string; quantity: number; unitPrice: number; itemType: string; productId?: string }[],
) {
  const { error: deleteError } = await supabase.from("order_items").delete().eq("order_id", orderId);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("order_items").insert(
    items.map((item) => ({
      order_id: orderId,
      organization_id: organizationId,
      item_type: item.itemType,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      product_id: item.productId ?? null,
    })),
  );
  if (insertError) throw insertError;
}

/** Catalog-linked line items only — the ones an inventory-status trigger actually moves stock for (server/domain/orders/applyInventoryTrigger.ts). */
export async function getCatalogProductOrderItems(
  supabase: SupabaseClient,
  organizationId: string,
  orderId: string,
): Promise<{ productId: string; quantity: number }[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("organization_id", organizationId)
    .eq("order_id", orderId)
    .eq("item_type", "catalog_product")
    .not("product_id", "is", null);
  if (error) throw error;
  return (data ?? []).map((row) => ({ productId: row.product_id as string, quantity: Number(row.quantity) }));
}
