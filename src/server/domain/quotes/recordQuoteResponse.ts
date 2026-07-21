import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkflowStatuses } from "@/server/data/workflow";

export type RecordQuoteResponseResult = { ok: true } | { ok: false; error: string };

/**
 * docs/user_flows.md Flow E step 4 (portal) and its staff-relayed equivalent
 * (a customer approves/declines by phone/text and staff records it). Both
 * paths call this same function, tagged by `actorType` — no separate,
 * less-audited write path for the portal (docs/security.md #4.6).
 */
export async function recordQuoteResponse(
  supabase: SupabaseClient,
  organizationId: string,
  quoteId: string,
  response: "approved" | "declined",
  declineReason: string | undefined,
  actor: { type: "user"; userId: string } | { type: "customer" },
): Promise<RecordQuoteResponseResult> {
  try {
    const statuses = await getWorkflowStatuses(supabase, organizationId, "quote");
    const targetStatus = statuses.find((s) => s.key === response);
    if (!targetStatus) {
      return { ok: false, error: "Quote workflow is missing an approved/declined status." };
    }

    const timestampField = response === "approved" ? "approved_at" : "declined_at";
    const { error: updateError } = await supabase
      .from("quotes")
      .update({ status_id: targetStatus.id, [timestampField]: new Date().toISOString() })
      .eq("id", quoteId);
    if (updateError) throw updateError;

    const { error: historyError } = await supabase.from("quote_status_history").insert({
      quote_id: quoteId,
      organization_id: organizationId,
      status_id: targetStatus.id,
      changed_by: actor.type === "user" ? actor.userId : null,
      source: "live",
      note: response === "declined" && declineReason ? declineReason : null,
    });
    if (historyError) throw historyError;

    return { ok: true };
  } catch (err) {
    console.error("recordQuoteResponse failed:", err);
    return { ok: false, error: "Could not record the response. Try again." };
  }
}
