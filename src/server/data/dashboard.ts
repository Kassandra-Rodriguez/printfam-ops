import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrderListRow } from "./orders";
import type { TaskRow } from "./tasks";

export type DashboardData = {
  overdueOrders: OrderListRow[];
  dueSoonOrders: OrderListRow[];
  waitingForPaymentOrders: OrderListRow[];
  overdueTasks: TaskRow[];
  todayTasks: TaskRow[];
};

const ORDER_SELECT =
  "id, order_number, title, order_type, promised_date, total, balance_remaining, created_at, " +
  "customer:customers(id, display_name), status:workflow_statuses(id, key, label, category)";

const TASK_SELECT =
  "id, title, status, due_date, priority, order_id, customer_id, order:orders(id, order_number, title)";

/**
 * Everything the dashboard's attention list needs, scoped to what Phase 3
 * actually built (docs/build_phases.md): orders due soon/overdue, orders
 * waiting for payment, and tasks due/overdue. Proofs, requests, and repairs
 * join this query in their own phases — the dashboard layout already has
 * room for them (docs/screens.md #1), this just doesn't fetch them yet.
 */
export async function getDashboardData(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<DashboardData> {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [ordersResult, tasksResult] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .not("promised_date", "is", null),
    supabase
      .from("tasks")
      .select(TASK_SELECT)
      .eq("organization_id", organizationId)
      .eq("status", "open")
      .not("due_date", "is", null)
      .lte("due_date", today)
      .order("due_date", { ascending: true }),
  ]);

  if (ordersResult.error) throw ordersResult.error;
  if (tasksResult.error) throw tasksResult.error;

  const allOrders = (ordersResult.data ?? []) as unknown as OrderListRow[];
  const isActiveOrder = (o: OrderListRow) =>
    o.status ? !["success", "danger"].includes(o.status.category) : true;

  const activeOrders = allOrders.filter(isActiveOrder);

  const overdueOrders = activeOrders
    .filter((o) => o.promised_date && o.promised_date < today)
    .sort((a, b) => (a.promised_date ?? "").localeCompare(b.promised_date ?? ""));

  const dueSoonOrders = activeOrders
    .filter((o) => o.promised_date && o.promised_date >= today && o.promised_date <= sevenDaysOut)
    .sort((a, b) => (a.promised_date ?? "").localeCompare(b.promised_date ?? ""));

  const { data: unpaidOrdersData, error: unpaidError } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .gt("balance_remaining", 0);
  if (unpaidError) throw unpaidError;

  const waitingForPaymentOrders = ((unpaidOrdersData ?? []) as unknown as OrderListRow[]).filter(
    isActiveOrder,
  );

  const allDueTasks = (tasksResult.data ?? []) as unknown as TaskRow[];
  const overdueTasks = allDueTasks.filter((t) => t.due_date && t.due_date < today);
  const todayTasks = allDueTasks.filter((t) => t.due_date === today);

  return { overdueOrders, dueSoonOrders, waitingForPaymentOrders, overdueTasks, todayTasks };
}
