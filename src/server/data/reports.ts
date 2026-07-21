import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportsSummary = {
  revenueByMonth: { month: string; amount: number }[];
  ordersByType: { type: string; count: number }[];
  requestsBySource: { source: string; count: number }[];
  conversionRate: number;
  averageOrderValue: number;
  outstandingBalance: number;
  overdueOrderCount: number;
  popularProducts: { name: string; quantitySold: number }[];
  orderRevenue: number;
  repairRevenue: number;
  completedCount: number;
  cancelledCount: number;
  repeatCustomerCount: number;
  totalCustomerCount: number;
};

/**
 * docs/product_requirements.md §7.15. Aggregated in JS after a handful of
 * scoped reads rather than Postgres-side GROUP BY RPCs — this app's own
 * scale assumption is a 1-3 person team / single location
 * (product_requirements.md §10.7), so a few thousand rows fetched and
 * reduced client-side is simpler than adding SQL aggregation surface for
 * data that small. `cost`/`products.cost` is never selected here — the
 * report reader can be Manager (docs/user_roles.md: "R, no cost/profit").
 */
export async function getReportsSummary(supabase: SupabaseClient, organizationId: string): Promise<ReportsSummary> {
  const [orders, requests, payments, orderItems, customers, repairTickets] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_type, total, balance_remaining, promised_date, status:workflow_statuses(key, category)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null),
    supabase.from("requests").select("id, source, status:workflow_statuses(key)").eq("organization_id", organizationId).is("deleted_at", null),
    supabase.from("payments").select("amount, kind, order_id, repair_ticket_id, paid_at").eq("organization_id", organizationId),
    supabase
      .from("order_items")
      .select("quantity, product:products(name)")
      .eq("organization_id", organizationId)
      .eq("item_type", "catalog_product")
      .not("product_id", "is", null),
    supabase.from("customers").select("id").eq("organization_id", organizationId).is("deleted_at", null),
    supabase.from("repair_tickets").select("id").eq("organization_id", organizationId).is("deleted_at", null),
  ]);

  for (const [name, result] of Object.entries({ orders, requests, payments, orderItems, customers, repairTickets })) {
    if (result.error) throw new Error(`getReportsSummary: ${name} query failed: ${result.error.message}`);
  }

  type OrderRow = {
    id: string;
    order_type: string;
    total: number;
    balance_remaining: number;
    promised_date: string | null;
    status: { key: string; category: string } | null;
  };
  const orderRows = (orders.data ?? []) as unknown as OrderRow[];

  type RequestRow = { id: string; source: string | null; status: { key: string } | null };
  const requestRows = (requests.data ?? []) as unknown as RequestRow[];

  type PaymentRow = { amount: number; kind: string; order_id: string | null; repair_ticket_id: string | null; paid_at: string };
  const paymentRows = (payments.data ?? []) as unknown as PaymentRow[];

  type OrderItemRow = { quantity: number; product: { name: string } | null };
  const orderItemRows = (orderItems.data ?? []) as unknown as OrderItemRow[];

  // Revenue by month — trailing, net of refunds, from actual cash collected.
  const monthTotals = new Map<string, number>();
  let orderRevenue = 0;
  let repairRevenue = 0;
  for (const p of paymentRows) {
    const signedAmount = p.kind === "refund" ? -p.amount : p.amount;
    const month = p.paid_at.slice(0, 7); // YYYY-MM
    monthTotals.set(month, (monthTotals.get(month) ?? 0) + signedAmount);
    if (p.order_id) orderRevenue += signedAmount;
    if (p.repair_ticket_id) repairRevenue += signedAmount;
  }
  const revenueByMonth = [...monthTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  const ordersByTypeMap = new Map<string, number>();
  for (const o of orderRows) ordersByTypeMap.set(o.order_type, (ordersByTypeMap.get(o.order_type) ?? 0) + 1);
  const ordersByType = [...ordersByTypeMap.entries()].map(([type, count]) => ({ type, count }));

  const requestsBySourceMap = new Map<string, number>();
  for (const r of requestRows) {
    const source = r.source ?? "unspecified";
    requestsBySourceMap.set(source, (requestsBySourceMap.get(source) ?? 0) + 1);
  }
  const requestsBySource = [...requestsBySourceMap.entries()].map(([source, count]) => ({ source, count }));

  const convertedRequests = requestRows.filter((r) => r.status?.key === "converted_to_order").length;
  const conversionRate = requestRows.length > 0 ? convertedRequests / requestRows.length : 0;

  const nonCancelledOrders = orderRows.filter((o) => o.status?.key !== "cancelled");
  const averageOrderValue =
    nonCancelledOrders.length > 0
      ? nonCancelledOrders.reduce((sum, o) => sum + Number(o.total), 0) / nonCancelledOrders.length
      : 0;

  const outstandingBalance = orderRows.reduce((sum, o) => sum + Math.max(0, Number(o.balance_remaining)), 0);

  const today = new Date().toISOString().slice(0, 10);
  const overdueOrderCount = orderRows.filter(
    (o) => o.promised_date && o.promised_date < today && o.status?.category !== "success" && o.status?.category !== "danger",
  ).length;

  const productTotals = new Map<string, number>();
  for (const item of orderItemRows) {
    const name = item.product?.name ?? "Unknown product";
    productTotals.set(name, (productTotals.get(name) ?? 0) + Number(item.quantity));
  }
  const popularProducts = [...productTotals.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, quantitySold]) => ({ name, quantitySold }));

  const completedCount = orderRows.filter((o) => o.status?.key === "completed").length;
  const cancelledCount = orderRows.filter((o) => o.status?.key === "cancelled").length;

  const ordersPerCustomer = new Map<string, number>();
  // order_id isn't customer-scoped in the payments/orders query above beyond
  // what's needed here — repeat-customer count needs customer_id, so pull it
  // directly rather than widen the orders select for every other metric.
  const { data: orderCustomers, error: orderCustomersError } = await supabase
    .from("orders")
    .select("customer_id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);
  if (orderCustomersError) throw orderCustomersError;
  for (const row of orderCustomers ?? []) {
    const id = row.customer_id as string;
    ordersPerCustomer.set(id, (ordersPerCustomer.get(id) ?? 0) + 1);
  }
  const repeatCustomerCount = [...ordersPerCustomer.values()].filter((n) => n > 1).length;

  return {
    revenueByMonth,
    ordersByType,
    requestsBySource,
    conversionRate,
    averageOrderValue,
    outstandingBalance,
    overdueOrderCount,
    popularProducts,
    orderRevenue,
    repairRevenue,
    completedCount,
    cancelledCount,
    repeatCustomerCount,
    totalCustomerCount: (customers.data ?? []).length,
  };
}
