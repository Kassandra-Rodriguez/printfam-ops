import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProofVersionRow = {
  id: string;
  version_number: number;
  file_attachment_id: string | null;
  customer_message: string | null;
  sent_at: string | null;
  created_at: string;
  file: { id: string; file_name: string; file_type: string; storage_path: string } | null;
  proof_responses: {
    id: string;
    response: string;
    revision_comment: string | null;
    responded_at: string;
    responded_via: string;
  }[];
};

export type ProofRow = {
  id: string;
  organization_id: string;
  order_id: string | null;
  repair_ticket_id: string | null;
  title: string;
  approval_required: boolean;
  visibility: string;
  latest_status: string;
  created_at: string;
  proof_versions: ProofVersionRow[];
};

const PROOF_SELECT =
  "id, organization_id, order_id, repair_ticket_id, title, approval_required, visibility, latest_status, created_at, " +
  "proof_versions(id, version_number, file_attachment_id, customer_message, sent_at, created_at, " +
  // Explicit FK hint: proof_versions<->attachments has two relationships
  // (file_attachment_id here, and attachments.proof_version_id the other
  // way), so PostgREST can't infer which one to embed without it.
  "file:attachments!proof_versions_file_attachment_id_fkey(id, file_name, file_type, storage_path), " +
  "proof_responses(id, response, revision_comment, responded_at, responded_via))";

export async function listProofsForOrder(
  supabase: SupabaseClient,
  organizationId: string,
  orderId: string,
): Promise<ProofRow[]> {
  const { data, error } = await supabase
    .from("proofs")
    .select(PROOF_SELECT)
    .eq("organization_id", organizationId)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ProofRow[];
}

export async function listProofsForRepairTicket(
  supabase: SupabaseClient,
  organizationId: string,
  repairTicketId: string,
): Promise<ProofRow[]> {
  const { data, error } = await supabase
    .from("proofs")
    .select(PROOF_SELECT)
    .eq("organization_id", organizationId)
    .eq("repair_ticket_id", repairTicketId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ProofRow[];
}

export async function getProof(supabase: SupabaseClient, proofId: string): Promise<ProofRow | null> {
  const { data, error } = await supabase.from("proofs").select(PROOF_SELECT).eq("id", proofId).maybeSingle();
  if (error) throw error;
  return data as unknown as ProofRow | null;
}

export async function updateProofLatestStatus(
  supabase: SupabaseClient,
  proofId: string,
  latestStatus: "draft" | "sent" | "approved" | "revision_requested",
) {
  const { error } = await supabase.from("proofs").update({ latest_status: latestStatus }).eq("id", proofId);
  if (error) throw error;
}

/**
 * docs/security.md Flow F step 5: has this order got a proof still blocking
 * production? Checked live against proofs/proof_versions/proof_responses —
 * never a cached flag — so approving late or re-requesting a revision after
 * approval both take effect immediately without a separate reconciliation
 * step.
 */
export async function hasUnresolvedApprovalGate(
  supabase: SupabaseClient,
  organizationId: string,
  orderId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("proofs")
    .select("id, approval_required, latest_status")
    .eq("organization_id", organizationId)
    .eq("order_id", orderId)
    .eq("approval_required", true);
  if (error) throw error;

  return (data ?? []).some((p) => p.latest_status !== "approved");
}
