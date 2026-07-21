import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordPaymentSchema, type RecordPaymentInput } from "@/lib/validation/payments";
import { insertPayment } from "@/server/data/payments";

export type RecordPaymentResult = { ok: true } | { ok: false; error: string };

/** docs/user_flows.md Flow G, docs/data_model.md quotes note: "deposit recorded pre-conversion." Quotes have no denormalized balance column, so unlike recordOrderPayment there's nothing to recompute — the payments list is the balance. */
export async function recordQuotePayment(
  supabase: SupabaseClient,
  organizationId: string,
  customerId: string,
  input: RecordPaymentInput,
): Promise<RecordPaymentResult> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!parsed.data.quoteId) {
    return { ok: false, error: "Missing quote" };
  }

  try {
    await insertPayment(supabase, {
      organizationId,
      customerId,
      quoteId: parsed.data.quoteId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      kind: parsed.data.kind,
      paidAt: parsed.data.paidAt,
      referenceNumber: parsed.data.referenceNumber,
      notes: parsed.data.notes,
    });
    return { ok: true };
  } catch (err) {
    console.error("recordQuotePayment failed:", err);
    return { ok: false, error: "Could not record the payment. Try again." };
  }
}
