import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkflowStatuses } from "@/server/data/workflow";

/** docs/user_flows.md Flow E step 3 — only advances "sent" -> "viewed"; never regresses an already-approved/declined quote. */
export async function markQuoteViewed(
  supabase: SupabaseClient,
  organizationId: string,
  quoteId: string,
): Promise<void> {
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("viewed_at, status:workflow_statuses(key)")
    .eq("id", quoteId)
    .single();
  if (quoteError || !quote) return;
  if (quote.viewed_at) return;
  const currentKey = (quote.status as unknown as { key: string } | null)?.key;
  if (currentKey !== "sent") return;

  const statuses = await getWorkflowStatuses(supabase, organizationId, "quote");
  const viewedStatus = statuses.find((s) => s.key === "viewed");
  if (!viewedStatus) return;

  await supabase
    .from("quotes")
    .update({ viewed_at: new Date().toISOString(), status_id: viewedStatus.id })
    .eq("id", quoteId);

  await supabase.from("quote_status_history").insert({
    quote_id: quoteId,
    organization_id: organizationId,
    status_id: viewedStatus.id,
    source: "live",
  });
}
