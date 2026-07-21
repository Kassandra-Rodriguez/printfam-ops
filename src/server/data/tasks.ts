import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  priority: string;
  order_id: string | null;
  customer_id: string | null;
  request_id: string | null;
  repair_ticket_id: string | null;
  order?: { id: string; order_number: string; title: string | null } | null;
};

const TASK_SELECT =
  "id, title, status, due_date, priority, order_id, customer_id, request_id, repair_ticket_id, order:orders(id, order_number, title)";

export async function listOpenTasks(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("organization_id", organizationId)
    .eq("status", "open")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as TaskRow[];
}

export async function listTasksForOrder(
  supabase: SupabaseClient,
  organizationId: string,
  orderId: string,
): Promise<TaskRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("organization_id", organizationId)
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as TaskRow[];
}

export async function insertTask(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: {
    title: string;
    dueDate?: string;
    priority: string;
    orderId?: string;
    customerId?: string;
    requestId?: string;
    repairTicketId?: string;
    quoteId?: string;
    proofId?: string;
  },
) {
  const { error } = await supabase.from("tasks").insert({
    organization_id: organizationId,
    title: input.title,
    due_date: input.dueDate || null,
    priority: input.priority,
    order_id: input.orderId ?? null,
    customer_id: input.customerId ?? null,
    request_id: input.requestId ?? null,
    repair_ticket_id: input.repairTicketId ?? null,
    quote_id: input.quoteId ?? null,
    proof_id: input.proofId ?? null,
    created_by: userId,
  });
  if (error) throw error;
}

export async function setTaskStatus(
  supabase: SupabaseClient,
  taskId: string,
  status: "open" | "completed" | "dismissed",
) {
  const { error } = await supabase
    .from("tasks")
    .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", taskId);
  if (error) throw error;
}
