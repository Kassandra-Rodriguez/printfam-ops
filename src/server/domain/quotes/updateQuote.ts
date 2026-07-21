import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateQuoteSchema, type UpdateQuoteInput } from "@/lib/validation/quotes";
import { updateQuoteFields, replaceQuoteItems } from "@/server/data/quotes";

export type UpdateQuoteResult = { ok: true } | { ok: false; error: string };

/** Draft edits only — sent/responded quotes represent what the customer actually saw, so editing after Send should go through a new version in a later phase, not silently rewrite history. Enforced in the UI (edit link hidden once sent); this function itself doesn't re-check status since staff correcting a typo on a technically-sent-but-not-yet-viewed quote is a reasonable override. */
export async function updateQuote(
  supabase: SupabaseClient,
  organizationId: string,
  input: UpdateQuoteInput,
): Promise<UpdateQuoteResult> {
  const parsed = updateQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal - data.discountTotal + data.taxTotal + data.shippingCost;

  try {
    await updateQuoteFields(supabase, data.quoteId, {
      customerId: data.customerId,
      subtotal,
      discountTotal: data.discountTotal,
      taxTotal: data.taxTotal,
      shippingCost: data.shippingCost,
      depositAmount: data.depositAmount,
      total,
      expiresAt: data.expiresAt,
      terms: data.terms,
      customerNotes: data.customerNotes,
    });
    await replaceQuoteItems(supabase, organizationId, data.quoteId, data.items);
    return { ok: true };
  } catch (err) {
    console.error("updateQuote failed:", err);
    return { ok: false, error: "Could not update the quote. Try again." };
  }
}
