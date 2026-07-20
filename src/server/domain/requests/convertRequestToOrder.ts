import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkflowStatuses } from "@/server/data/workflow";

/**
 * The "no data loss" half of docs/user_flows.md Flow C: re-points (never
 * copies) everything that referenced the request onto the new order, using
 * the same explicit-FK columns those tables already have — attachments,
 * conversations, and tasks all keep their original request_id *and* gain the
 * order_id, so both the request's and the order's history stay intact.
 * Called by createOrder() when it's given a `convertedFromRequestId`, once
 * the order row itself exists.
 */
export async function finalizeRequestConversion(
  supabase: SupabaseClient,
  organizationId: string,
  requestId: string,
  orderId: string,
): Promise<void> {
  const statuses = await getWorkflowStatuses(supabase, organizationId, "request");
  const convertedStatus = statuses.find((s) => s.key === "converted_to_order");

  await supabase
    .from("requests")
    .update({
      converted_order_id: orderId,
      ...(convertedStatus ? { status_id: convertedStatus.id } : {}),
    })
    .eq("id", requestId);

  await supabase
    .from("attachments")
    .update({ order_id: orderId })
    .eq("request_id", requestId)
    .is("order_id", null);

  await supabase
    .from("conversations")
    .update({ related_order_id: orderId })
    .eq("related_request_id", requestId)
    .is("related_order_id", null);

  await supabase
    .from("tasks")
    .update({ order_id: orderId })
    .eq("request_id", requestId)
    .is("order_id", null);
}
