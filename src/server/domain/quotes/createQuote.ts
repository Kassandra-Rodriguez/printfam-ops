import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createQuoteSchema, type CreateQuoteInput } from "@/lib/validation/quotes";
import { getWorkflowStatuses } from "@/server/data/workflow";

export type CreateQuoteResult = { status: "created"; quoteId: string } | { status: "error"; error: string };

/** docs/user_flows.md Flow E step 1 — always starts "Draft." */
export async function createQuote(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateQuoteInput,
): Promise<CreateQuoteResult> {
  const parsed = createQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = subtotal - data.discountTotal + data.taxTotal + data.shippingCost;

  try {
    const statuses = await getWorkflowStatuses(supabase, organizationId, "quote");
    const draftStatus = statuses.find((s) => s.key === "draft");
    if (!draftStatus) {
      return { status: "error", error: "Quote workflow isn't set up for this organization." };
    }

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert({
        organization_id: organizationId,
        customer_id: data.customerId,
        request_id: data.requestId ?? null,
        status_id: draftStatus.id,
        subtotal,
        discount_total: data.discountTotal,
        tax_total: data.taxTotal,
        shipping_cost: data.shippingCost,
        deposit_amount: data.depositAmount,
        total,
        expires_at: data.expiresAt || null,
        terms: data.terms || null,
        customer_notes: data.customerNotes || null,
        created_by: userId,
      })
      .select("id")
      .single();

    if (quoteError || !quote) {
      console.error("createQuote: quote insert failed:", quoteError);
      return { status: "error", error: "Could not create the quote. Try again." };
    }

    const { error: itemsError } = await supabase.from("quote_items").insert(
      data.items.map((item) => ({
        quote_id: quote.id,
        organization_id: organizationId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        item_type: item.itemType,
      })),
    );
    if (itemsError) {
      console.error("createQuote: items insert failed:", itemsError);
      return { status: "error", error: "Quote was created, but its items failed to save." };
    }

    const { error: historyError } = await supabase.from("quote_status_history").insert({
      quote_id: quote.id,
      organization_id: organizationId,
      status_id: draftStatus.id,
      changed_by: userId,
      source: "live",
    });
    if (historyError) {
      console.error("createQuote: status history insert failed:", historyError);
      return { status: "error", error: "Quote was created, but its status history failed to save." };
    }

    return { status: "created", quoteId: quote.id };
  } catch (err) {
    console.error("createQuote failed:", err);
    return { status: "error", error: "Could not create the quote. Try again." };
  }
}
