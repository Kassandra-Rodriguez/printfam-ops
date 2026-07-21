import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Deliberately narrow selects for the customer portal — never reuse the
 * staff-facing getQuote()/getProof() here, since those join tasks/internal
 * notes that must never reach the portal's rendered HTML or API responses
 * (docs/security.md #4.5 and the "internal-only fields" rule under §Portal
 * screen states). Every field below is safe for a customer to see.
 */
export type PortalQuoteView = {
  id: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_cost: number;
  deposit_amount: number;
  total: number;
  expires_at: string | null;
  terms: string | null;
  customer_notes: string | null;
  approved_at: string | null;
  declined_at: string | null;
  status: { key: string; label: string } | null;
  quote_items: { id: string; description: string; quantity: number; unit_price: number }[];
};

export async function getQuoteForPortal(
  supabase: SupabaseClient,
  organizationId: string,
  quoteId: string,
): Promise<PortalQuoteView | null> {
  const { data, error } = await supabase
    .from("quotes")
    .select(
      `id, subtotal, discount_total, tax_total, shipping_cost, deposit_amount, total,
       expires_at, terms, customer_notes, approved_at, declined_at,
       status:workflow_statuses(key, label),
       quote_items(id, description, quantity, unit_price)`,
    )
    .eq("id", quoteId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as PortalQuoteView | null;
}

export type PortalPaymentView = { id: string; amount: number; method: string; kind: string; paid_at: string };

export type PortalOrderView = {
  id: string;
  order_number: string;
  title: string | null;
  status: { key: string; label: string } | null;
  total: number;
  balance_remaining: number;
  deposit_required: number;
  deposit_paid: number;
  promised_date: string | null;
  fulfillment_method: string | null;
  tracking_number: string | null;
  shipping_address: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  } | null;
  order_items: { id: string; description: string; quantity: number; unit_price: number }[];
  payments: PortalPaymentView[];
};

/** Deliberately omits: notes, internal_deadline, assigned_user_id, created_by, source, converted_from_request_id, tasks. */
export async function getOrderForPortal(
  supabase: SupabaseClient,
  organizationId: string,
  orderId: string,
): Promise<PortalOrderView | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `id, order_number, title, total, balance_remaining, deposit_required, deposit_paid,
       promised_date, fulfillment_method, tracking_number,
       status:workflow_statuses(key, label),
       shipping_address:customer_addresses(line1, line2, city, state, postal_code, country),
       order_items(id, description, quantity, unit_price),
       payments(id, amount, method, kind, paid_at)`,
    )
    .eq("id", orderId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as PortalOrderView | null;
}

export type PortalRepairTicketView = {
  id: string;
  ticket_number: string;
  device_model: string;
  reported_issue: string;
  status: { key: string; label: string } | null;
  identified_problem: string | null;
  recommended_repair: string | null;
  customer_approved_at: string | null;
  final_balance: number;
  warranty_period_days: number | null;
  completed_summary: string | null;
  payments: PortalPaymentView[];
};

/** Deliberately omits: condition_at_intake/accessories_received (internal intake notes), assigned_user_id, created_by, tasks, repair_diagnostics (internal diagnostic log). */
export async function getRepairTicketForPortal(
  supabase: SupabaseClient,
  organizationId: string,
  repairTicketId: string,
): Promise<PortalRepairTicketView | null> {
  const { data, error } = await supabase
    .from("repair_tickets")
    .select(
      `id, ticket_number, device_model, reported_issue, identified_problem, recommended_repair,
       customer_approved_at, final_balance, warranty_period_days, completed_summary,
       status:workflow_statuses(key, label),
       payments(id, amount, method, kind, paid_at)`,
    )
    .eq("id", repairTicketId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as PortalRepairTicketView | null;
}

export type PortalMessageView = { id: string; body: string; direction: string; occurred_at: string; sent_by_customer: boolean };

/** Only this order/repair's own thread — never another record's, and never a staff-only field beyond the message body itself. */
export async function getMessagesForPortal(
  supabase: SupabaseClient,
  organizationId: string,
  scope: { orderId?: string; repairTicketId?: string },
): Promise<PortalMessageView[]> {
  let query = supabase
    .from("conversations")
    .select("messages(id, body, direction, occurred_at, sent_by_customer)")
    .eq("organization_id", organizationId);
  query = scope.orderId ? query.eq("related_order_id", scope.orderId) : query.eq("related_repair_ticket_id", scope.repairTicketId);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as { messages: PortalMessageView[] }[])
    .flatMap((c) => c.messages)
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
}

/** Only customer_visible files — internal_only attachments must never reach the portal (docs/security.md #5). */
export async function getCustomerVisibleAttachments(
  supabase: SupabaseClient,
  organizationId: string,
  scope: { orderId?: string; repairTicketId?: string },
): Promise<{ id: string; file_name: string; file_type: string; storage_path: string; created_at: string }[]> {
  let query = supabase
    .from("attachments")
    .select("id, file_name, file_type, storage_path, created_at")
    .eq("organization_id", organizationId)
    .eq("visibility", "customer_visible");
  query = scope.orderId ? query.eq("order_id", scope.orderId) : query.eq("repair_ticket_id", scope.repairTicketId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
