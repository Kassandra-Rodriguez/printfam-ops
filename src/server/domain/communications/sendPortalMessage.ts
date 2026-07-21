import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { insertPortalMessage } from "@/server/data/communications";

export type SendPortalMessageResult = { ok: true } | { ok: false; error: string };

export async function sendPortalMessage(
  supabase: SupabaseClient,
  organizationId: string,
  customerId: string,
  body: string,
  scope: { orderId?: string; repairTicketId?: string },
): Promise<SendPortalMessageResult> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Message can't be empty" };
  }

  try {
    await insertPortalMessage(supabase, organizationId, {
      customerId,
      body: trimmed,
      relatedOrderId: scope.orderId,
      relatedRepairTicketId: scope.repairTicketId,
    });
    return { ok: true };
  } catch (err) {
    console.error("sendPortalMessage failed:", err);
    return { ok: false, error: "Could not send the message. Try again." };
  }
}
