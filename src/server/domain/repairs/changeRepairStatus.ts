import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateRepairTicketStatus } from "@/server/data/repairs";

export async function changeRepairStatus(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  repairTicketId: string,
  statusId: string,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateRepairTicketStatus(supabase, repairTicketId, statusId);
    const { error } = await supabase.from("repair_ticket_status_history").insert({
      repair_ticket_id: repairTicketId,
      organization_id: organizationId,
      status_id: statusId,
      changed_by: userId,
      source: "live",
      note: note || null,
    });
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error("changeRepairStatus failed:", err);
    return { ok: false, error: "Could not update the status. Try again." };
  }
}
