import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateOrderStatus } from "@/server/data/orders";
import { isProductionStageStatus } from "@/server/data/workflow";
import { hasUnresolvedApprovalGate } from "@/server/data/proofs";

export async function changeOrderStatus(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  orderId: string,
  statusId: string,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // docs/user_flows.md Flow F step 5 / docs/security.md: enforced here, the
    // single write path every status change goes through — not just a
    // disabled button in the UI, so a direct action call can't bypass it.
    if (await isProductionStageStatus(supabase, statusId)) {
      if (await hasUnresolvedApprovalGate(supabase, organizationId, orderId)) {
        return {
          ok: false,
          error: "This order has a proof awaiting customer approval — resolve it before moving to production.",
        };
      }
    }

    await updateOrderStatus(supabase, orderId, statusId);
    const { error } = await supabase.from("order_status_history").insert({
      order_id: orderId,
      organization_id: organizationId,
      status_id: statusId,
      changed_by: userId,
      source: "live",
      note: note || null,
    });
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error("changeOrderStatus failed:", err);
    return { ok: false, error: "Could not update the status. Try again." };
  }
}
