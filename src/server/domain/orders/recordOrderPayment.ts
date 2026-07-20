import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordPaymentSchema, type RecordPaymentInput } from "@/lib/validation/payments";
import { insertPayment, recomputeOrderBalance } from "@/server/data/payments";

export type RecordPaymentResult = { ok: true } | { ok: false; error: string };

/** docs/user_flows.md Flow G. */
export async function recordOrderPayment(
  supabase: SupabaseClient,
  organizationId: string,
  customerId: string,
  input: RecordPaymentInput,
): Promise<RecordPaymentResult> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!parsed.data.orderId) {
    return { ok: false, error: "Missing order" };
  }

  try {
    await insertPayment(supabase, {
      organizationId,
      customerId,
      orderId: parsed.data.orderId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      kind: parsed.data.kind,
      paidAt: parsed.data.paidAt,
      referenceNumber: parsed.data.referenceNumber,
      notes: parsed.data.notes,
    });
    await recomputeOrderBalance(supabase, parsed.data.orderId);
    return { ok: true };
  } catch (err) {
    console.error("recordOrderPayment failed:", err);
    return { ok: false, error: "Could not record the payment. Try again." };
  }
}
