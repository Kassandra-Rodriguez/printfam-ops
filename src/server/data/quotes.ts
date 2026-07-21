import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusCategory } from "./workflow";

export type QuoteListRow = {
  id: string;
  total: number;
  expires_at: string | null;
  created_at: string;
  customer: { id: string; display_name: string } | null;
  request_id: string | null;
  status: { id: string; key: string; label: string; category: StatusCategory } | null;
};

const QUOTE_LIST_SELECT =
  "id, total, expires_at, created_at, request_id, " +
  "customer:customers(id, display_name), status:workflow_statuses(id, key, label, category)";

export async function listQuotes(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<QuoteListRow[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select(QUOTE_LIST_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as QuoteListRow[];
}

export async function getQuote(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("quotes")
    .select(
      `*,
       customer:customers(id, display_name, phone, email),
       status:workflow_statuses(id, key, label, category),
       quote_items(*),
       quote_status_history(id, changed_at, source, note, status:workflow_statuses(label, category)),
       payments(id, amount, method, kind, paid_at, reference_number, notes, created_at),
       tasks(id, title, status, due_date, priority, assigned_user_id, quote_id, customer_id)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateQuoteStatus(
  supabase: SupabaseClient,
  quoteId: string,
  statusId: string,
) {
  const { error } = await supabase.from("quotes").update({ status_id: statusId }).eq("id", quoteId);
  if (error) throw error;
}

export async function updateQuoteFields(
  supabase: SupabaseClient,
  quoteId: string,
  fields: {
    customerId: string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    shippingCost: number;
    depositAmount: number;
    total: number;
    expiresAt?: string;
    terms?: string;
    customerNotes?: string;
  },
) {
  const { error } = await supabase
    .from("quotes")
    .update({
      customer_id: fields.customerId,
      subtotal: fields.subtotal,
      discount_total: fields.discountTotal,
      tax_total: fields.taxTotal,
      shipping_cost: fields.shippingCost,
      deposit_amount: fields.depositAmount,
      total: fields.total,
      expires_at: fields.expiresAt || null,
      terms: fields.terms || null,
      customer_notes: fields.customerNotes || null,
    })
    .eq("id", quoteId);
  if (error) throw error;
}

/** Wholesale replace, same reasoning as replaceOrderItems/replaceRepairParts — a quote's line-item count is always small. */
export async function replaceQuoteItems(
  supabase: SupabaseClient,
  organizationId: string,
  quoteId: string,
  items: { description: string; quantity: number; unitPrice: number; itemType: string }[],
) {
  const { error: deleteError } = await supabase.from("quote_items").delete().eq("quote_id", quoteId);
  if (deleteError) throw deleteError;

  if (items.length === 0) return;

  const { error: insertError } = await supabase.from("quote_items").insert(
    items.map((item) => ({
      quote_id: quoteId,
      organization_id: organizationId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      item_type: item.itemType,
    })),
  );
  if (insertError) throw insertError;
}
