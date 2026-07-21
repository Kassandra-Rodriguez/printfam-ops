import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateProofLatestStatus } from "@/server/data/proofs";

export type RecordProofResponseResult = { ok: true } | { ok: false; error: string };

/**
 * docs/user_flows.md Flow F step 3, and its staff-relayed equivalent. Both
 * paths write through this one function (docs/security.md #4.6) — the
 * portal Route Handler and the staff Server Action both call it, tagged by
 * `respondedVia`.
 */
export async function recordProofResponse(
  supabase: SupabaseClient,
  organizationId: string,
  proofVersionId: string,
  response: "approved" | "revision_requested",
  revisionComment: string | undefined,
  respondedVia: "portal" | "staff_relayed",
): Promise<RecordProofResponseResult> {
  try {
    const { data: version, error: versionError } = await supabase
      .from("proof_versions")
      .select("proof_id")
      .eq("id", proofVersionId)
      .single();
    if (versionError || !version) throw versionError ?? new Error("Proof version not found");

    const { error: insertError } = await supabase.from("proof_responses").insert({
      proof_version_id: proofVersionId,
      organization_id: organizationId,
      response,
      revision_comment: response === "revision_requested" ? revisionComment || null : null,
      responded_via: respondedVia,
    });
    if (insertError) throw insertError;

    await updateProofLatestStatus(supabase, version.proof_id, response);

    return { ok: true };
  } catch (err) {
    console.error("recordProofResponse failed:", err);
    return { ok: false, error: "Could not record the response. Try again." };
  }
}
