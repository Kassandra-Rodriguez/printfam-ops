import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkflowStatuses } from "@/server/data/workflow";
import { updateQuoteStatus } from "@/server/data/quotes";
import { issuePortalToken } from "@/server/domain/portal/issuePortalToken";

export type SendQuoteResult =
  | { ok: true; portalPath: string | null }
  | { ok: false; error: string };

/**
 * docs/user_flows.md Flow E step 2. `portalPath` is null when an existing
 * unexpired link already covers this quote and `forceReissue` is false —
 * nothing new to send, the customer's original link keeps working (see
 * issuePortalToken.ts). Pass `forceReissue: true` when staff explicitly
 * wants a fresh copyable link (e.g. they didn't copy it in time) — the raw
 * token is never stored, so a new link is the only way to get one again,
 * and it supersedes the previous one.
 */
export async function sendQuote(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  quoteId: string,
  forceReissue: boolean = false,
): Promise<SendQuoteResult> {
  try {
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id, customer_id, sent_at, status:workflow_statuses(key)")
      .eq("id", quoteId)
      .single();
    if (quoteError || !quote) throw quoteError ?? new Error("Quote not found");
    const currentStatusKey = (quote.status as unknown as { key: string } | null)?.key;

    const issued = await issuePortalToken(
      organizationId,
      quote.customer_id,
      "quote",
      quoteId,
      userId,
      undefined,
      forceReissue,
    );

    if (!quote.sent_at) {
      const { error: sentError } = await supabase
        .from("quotes")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", quoteId);
      if (sentError) throw sentError;
    }

    const statuses = await getWorkflowStatuses(supabase, organizationId, "quote");
    const sentStatus = statuses.find((s) => s.key === "sent");
    if (sentStatus && currentStatusKey === "draft") {
      await updateQuoteStatus(supabase, quoteId, sentStatus.id);
      await supabase.from("quote_status_history").insert({
        quote_id: quoteId,
        organization_id: organizationId,
        status_id: sentStatus.id,
        changed_by: userId,
        source: "live",
      });
    }

    return { ok: true, portalPath: issued.reused ? null : `/portal/${issued.rawToken}` };
  } catch (err) {
    console.error("sendQuote failed:", err);
    return { ok: false, error: "Could not send the quote. Try again." };
  }
}
