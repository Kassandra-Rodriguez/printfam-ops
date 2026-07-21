import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentInsert = {
  organizationId: string;
  customerId: string;
  orderId?: string;
  repairTicketId?: string;
  quoteId?: string;
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
    order_id: payment.orderId ?? null,
    repair_ticket_id: payment.repairTicketId ?? null,
    quote_id: payment.quoteId ?? null,
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

/**
 * repair_tickets has no separate "total" column (see docs/data_model.md) —
 * final_balance doubles as both the charge total and the remaining balance,
 * recomputed in full each time from diagnostic_fee + labor_cost + parts cost,
 * net of payments. Same "one place this math lives" reasoning as
 * recomputeOrderBalance above.
 */
export async function recomputeRepairBalance(supabase: SupabaseClient, repairTicketId: string) {
  const { data: ticket, error: ticketError } = await supabase
    .from("repair_tickets")
    .select("diagnostic_fee, labor_cost")
    .eq("id", repairTicketId)
    .single();
  if (ticketError) throw ticketError;

  const { data: parts, error: partsError } = await supabase
    .from("repair_parts")
    .select("cost, quantity")
    .eq("repair_ticket_id", repairTicketId);
  if (partsError) throw partsError;

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount, kind")
    .eq("repair_ticket_id", repairTicketId);
  if (paymentsError) throw paymentsError;

  const partsTotal = (parts ?? []).reduce(
    (sum, p) => sum + Number(p.cost ?? 0) * Number(p.quantity ?? 0),
    0,
  );
  const charges = Number(ticket.diagnostic_fee ?? 0) + Number(ticket.labor_cost ?? 0) + partsTotal;

  let netPaid = 0;
  for (const p of payments ?? []) {
    netPaid += p.kind === "refund" ? -p.amount : p.amount;
  }

  const { error: updateError } = await supabase
    .from("repair_tickets")
    .update({ final_balance: charges - netPaid })
    .eq("id", repairTicketId);
  if (updateError) throw updateError;
}
