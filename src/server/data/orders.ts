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
       tasks(id, title, status, due_date, priority, assigned_user_id, order_id, customer_id)`,
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
