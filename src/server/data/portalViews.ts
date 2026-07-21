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
