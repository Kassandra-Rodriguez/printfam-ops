import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateRepairTicketSchema, type UpdateRepairTicketInput } from "@/lib/validation/repairs";
import { updateRepairTicketFields, replaceRepairParts } from "@/server/data/repairs";
import { recomputeRepairBalance } from "@/server/data/payments";

export type UpdateRepairTicketResult = { ok: true } | { ok: false; error: string };

/**
 * Edits everything about a ticket except status (the detail page's status
 * control is the only path that writes repair_ticket_status_history) and
 * payments — same split as updateOrder.ts. Diagnostic fee and labor cost can
 * change here, and parts are replaced wholesale, so balance is always
 * recomputed afterward.
 */
export async function updateRepairTicket(
  supabase: SupabaseClient,
  organizationId: string,
  input: UpdateRepairTicketInput,
): Promise<UpdateRepairTicketResult> {
  const parsed = updateRepairTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  try {
    await updateRepairTicketFields(supabase, data.repairTicketId, {
      deviceModel: data.deviceModel,
      serialNumber: data.serialNumber,
      reportedIssue: data.reportedIssue,
      errorCodes: data.errorCodes,
      conditionAtIntake: data.conditionAtIntake,
      accessoriesReceived: data.accessoriesReceived,
      diagnosticFee: data.diagnosticFee,
      identifiedProblem: data.identifiedProblem,
      recommendedRepair: data.recommendedRepair,
      laborCost: data.laborCost,
      warrantyPeriodDays: data.warrantyPeriodDays,
      completedSummary: data.completedSummary,
    });
    await replaceRepairParts(supabase, organizationId, data.repairTicketId, data.parts);
    await recomputeRepairBalance(supabase, data.repairTicketId);
    return { ok: true };
  } catch (err) {
    console.error("updateRepairTicket failed:", err);
    return { ok: false, error: "Could not save changes. Try again." };
  }
}
