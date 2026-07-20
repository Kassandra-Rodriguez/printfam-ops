import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateRepairTicketApproval } from "@/server/data/repairs";

/**
 * Records the customer's approve/decline decision on the recommended repair
 * (docs/user_flows.md Flow D step 3). Only the "staff relays it" path exists
 * for now — the portal-token version of this (Flow J) is scoped to Phase 7
 * per docs/build_phases.md, not retrofitted here.
 */
export async function setRepairApproval(
  supabase: SupabaseClient,
  repairTicketId: string,
  approved: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateRepairTicketApproval(supabase, repairTicketId, approved);
    return { ok: true };
  } catch (err) {
    console.error("setRepairApproval failed:", err);
    return { ok: false, error: "Could not save the approval. Try again." };
  }
}
