import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentInsert = {
  organizationId: string;
  customerId: string;
  orderId: string;
  amount: number;
  method: string;
  kind: "deposit" | "final" | "full" | "refund";
  paidAt: string;
  referenceNumber?: string;
  notes?: string;
};

export async function insertPayment(supabase: SupabaseClient, payment: PaymentInsert) {
  const { error } = await supabase.from("payments").insert({
    organization_id: payment.organizationId,
    customer_id: payment.customerId,
    order_id: payment.orderId,
    amount: payment.amount,
    method: payment.method,
    kind: payment.kind,
    paid_at: payment.paidAt,
    reference_number: payment.referenceNumber ?? null,
    notes: payment.notes ?? null,
  });
  if (error) throw error;
}

/**
 * The single place orders.deposit_paid / balance_remaining get recalculated,
 * called after every payment write (creation, backfill, future edits) so the
 * two never drift — docs/user_flows.md Flow G: "recompute[s] immediately
 * everywhere they're displayed."
 */
export async function recomputeOrderBalance(supabase: SupabaseClient, orderId: string) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("total")
    .eq("id", orderId)
    .single();
  if (orderError) throw orderError;

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount, kind")
    .eq("order_id", orderId);
  if (paymentsError) throw paymentsError;

  let depositPaid = 0;
  let netPaid = 0;
  for (const p of payments ?? []) {
    if (p.kind === "refund") {
      netPaid -= p.amount;
    } else {
      netPaid += p.amount;
      if (p.kind === "deposit") depositPaid += p.amount;
    }
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      deposit_paid: depositPaid,
      balance_remaining: Number(order.total) - netPaid,
    })
    .eq("id", orderId);
  if (updateError) throw updateError;
}
