import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadProofVersionSchema, type UploadProofVersionInput } from "@/lib/validation/proofs";
import { updateProofLatestStatus } from "@/server/data/proofs";

export type UploadProofVersionResult = { ok: true } | { ok: false; error: string };

/**
 * docs/user_flows.md Flow F step 1/4: auto-increments the version number and
 * never overwrites a prior one. Resets the proof back to "draft" — a new
 * version is unreviewed until staff explicitly sends it, even after a
 * revision request on the previous version.
 */
export async function uploadProofVersion(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: UploadProofVersionInput,
): Promise<UploadProofVersionResult> {
  const parsed = uploadProofVersionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  try {
    const { data: proof, error: proofError } = await supabase
      .from("proofs")
      .select("visibility")
      .eq("id", data.proofId)
      .single();
    if (proofError || !proof) throw proofError ?? new Error("Proof not found");

    const { data: existingVersions, error: versionsError } = await supabase
      .from("proof_versions")
      .select("version_number")
      .eq("proof_id", data.proofId)
      .order("version_number", { ascending: false })
      .limit(1);
    if (versionsError) throw versionsError;
    const nextVersionNumber = (existingVersions?.[0]?.version_number ?? 0) + 1;

    const { data: version, error: versionError } = await supabase
      .from("proof_versions")
      .insert({
        proof_id: data.proofId,
        organization_id: organizationId,
        version_number: nextVersionNumber,
        customer_message: data.customerMessage || null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (versionError || !version) {
      console.error("uploadProofVersion: version insert failed:", versionError);
      return { ok: false, error: "Could not save the version. Try again." };
    }

    const { data: attachment, error: attachmentError } = await supabase
      .from("attachments")
      .insert({
        organization_id: organizationId,
        proof_version_id: version.id,
        file_name: data.fileName,
        file_type: data.fileType,
        storage_path: data.storagePath,
        visibility: proof.visibility,
        uploaded_by: userId,
      })
      .select("id")
      .single();
    if (attachmentError || !attachment) {
      console.error("uploadProofVersion: attachment insert failed:", attachmentError);
      return { ok: false, error: "Version was saved, but the file failed to attach." };
    }

    const { error: linkError } = await supabase
      .from("proof_versions")
      .update({ file_attachment_id: attachment.id })
      .eq("id", version.id);
    if (linkError) throw linkError;

    await updateProofLatestStatus(supabase, data.proofId, "draft");

    return { ok: true };
  } catch (err) {
    console.error("uploadProofVersion failed:", err);
    return { ok: false, error: "Could not upload the version. Try again." };
  }
}
