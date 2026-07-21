import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateQuoteStatus } from "@/server/data/quotes";

export async function changeQuoteStatus(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  quoteId: string,
  statusId: string,
  note?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateQuoteStatus(supabase, quoteId, statusId);
    const { error } = await supabase.from("quote_status_history").insert({
      quote_id: quoteId,
      organization_id: organizationId,
      status_id: statusId,
      changed_by: userId,
      source: "live",
      note: note || null,
    });
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    console.error("changeQuoteStatus failed:", err);
    return { ok: false, error: "Could not update the status. Try again." };
  }
}
