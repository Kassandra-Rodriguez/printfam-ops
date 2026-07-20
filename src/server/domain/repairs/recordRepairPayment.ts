import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordPaymentSchema, type RecordPaymentInput } from "@/lib/validation/payments";
import { insertPayment, recomputeRepairBalance } from "@/server/data/payments";

export type RecordRepairPaymentResult = { ok: true } | { ok: false; error: string };

/** docs/user_flows.md Flow G, applied to a repair ticket instead of an order. */
export async function recordRepairPayment(
  supabase: SupabaseClient,
  organizationId: string,
  customerId: string,
  input: RecordPaymentInput,
): Promise<RecordRepairPaymentResult> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!parsed.data.repairTicketId) {
    return { ok: false, error: "Missing repair ticket" };
  }

  try {
    await insertPayment(supabase, {
      organizationId,
      customerId,
      repairTicketId: parsed.data.repairTicketId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      kind: parsed.data.kind,
      paidAt: parsed.data.paidAt,
      referenceNumber: parsed.data.referenceNumber,
      notes: parsed.data.notes,
    });
    await recomputeRepairBalance(supabase, parsed.data.repairTicketId);
    return { ok: true };
  } catch (err) {
    console.error("recordRepairPayment failed:", err);
    return { ok: false, error: "Could not record the payment. Try again." };
  }
}
