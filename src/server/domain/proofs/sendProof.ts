import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateProofLatestStatus } from "@/server/data/proofs";
import { issuePortalToken } from "@/server/domain/portal/issuePortalToken";

export type SendProofResult = { ok: true; portalPath: string | null } | { ok: false; error: string };

/**
 * docs/user_flows.md Flow F step 2. Edge case: internal-only proofs never
 * generate a portal token and never appear in the customer portal, even if
 * requested by ID — enforced here, not just by hiding the button.
 */
export async function sendProof(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  proofId: string,
): Promise<SendProofResult> {
  try {
    const { data: proof, error: proofError } = await supabase
      .from("proofs")
      .select(
        `id, visibility, order_id, repair_ticket_id,
         order:orders(customer_id), repair_ticket:repair_tickets(customer_id)`,
      )
      .eq("id", proofId)
      .single();
    if (proofError || !proof) throw proofError ?? new Error("Proof not found");

    if (proof.visibility !== "customer_visible") {
      return { ok: false, error: "Mark this proof customer-visible before sending it." };
    }

    const customerId =
      (proof.order as unknown as { customer_id: string } | null)?.customer_id ??
      (proof.repair_ticket as unknown as { customer_id: string } | null)?.customer_id;
    if (!customerId) {
      return { ok: false, error: "Could not resolve the customer for this proof." };
    }

    const { data: latestVersion, error: versionError } = await supabase
      .from("proof_versions")
      .select("id, sent_at")
      .eq("proof_id", proofId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (versionError) throw versionError;
    if (!latestVersion) {
      return { ok: false, error: "Upload a version before sending." };
    }

    const issued = await issuePortalToken(organizationId, customerId, "proof", proofId, userId);

    if (!latestVersion.sent_at) {
      const { error: sentError } = await supabase
        .from("proof_versions")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", latestVersion.id);
      if (sentError) throw sentError;
    }

    await updateProofLatestStatus(supabase, proofId, "sent");

    return { ok: true, portalPath: issued.reused ? null : `/portal/${issued.rawToken}` };
  } catch (err) {
    console.error("sendProof failed:", err);
    return { ok: false, error: "Could not send the proof. Try again." };
  }
}
