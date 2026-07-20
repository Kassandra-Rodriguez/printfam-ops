import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateOrderStatus } from "@/server/data/orders";

export async function changeOrderStatus(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  orderId: string,
  statusId: string,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
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
  } catch {
    return { ok: false, error: "Could not update the status. Try again." };
  }
}
