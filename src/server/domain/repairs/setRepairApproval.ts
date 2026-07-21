import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateRepairTicketApproval } from "@/server/data/repairs";

/**
 * Records the customer's approve/decline decision on the recommended repair
 * (docs/user_flows.md Flow D step 3). Called from both the staff-relayed
 * Server Action and the portal Route Handler (Flow J,
 * app/api/portal/[token]/repair-approval) — one function, two callers, per
 * docs/security.md #4.6.
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
