import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkflowStatuses } from "@/server/data/workflow";
import { recomputeOrderBalance } from "@/server/data/payments";

/**
 * The "no data loss" half of docs/user_flows.md Flow E step 5, mirroring
 * finalizeRequestConversion.ts. Payments are re-pointed (quote_id cleared,
 * order_id set) rather than duplicated, since payments enforces "exactly one
 * of order_id/repair_ticket_id/quote_id" — unlike attachments/tasks, which
 * allow keeping both FKs so the quote's own history stays intact too.
 */
export async function finalizeQuoteConversion(
  supabase: SupabaseClient,
  organizationId: string,
  quoteId: string,
  orderId: string,
): Promise<void> {
  const statuses = await getWorkflowStatuses(supabase, organizationId, "quote");
  const convertedStatus = statuses.find((s) => s.key === "converted_to_order");

  await supabase
    .from("quotes")
    .update({
      converted_order_id: orderId,
      ...(convertedStatus ? { status_id: convertedStatus.id } : {}),
    })
    .eq("id", quoteId);

  await supabase
    .from("attachments")
    .update({ order_id: orderId })
    .eq("quote_id", quoteId)
    .is("order_id", null);

  await supabase
    .from("tasks")
    .update({ order_id: orderId })
    .eq("quote_id", quoteId)
    .is("order_id", null);

  const { data: quotePayments, error: paymentsError } = await supabase
    .from("payments")
    .select("id")
    .eq("quote_id", quoteId);
  if (paymentsError) throw paymentsError;

  if (quotePayments && quotePayments.length > 0) {
    await supabase
      .from("payments")
      .update({ order_id: orderId, quote_id: null })
      .eq("quote_id", quoteId);
    await recomputeOrderBalance(supabase, orderId);
  }
}
