import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAttachmentSignedUrl } from "@/server/data/attachments";
import type { ProofRow, ProofVersionRow } from "@/server/data/proofs";

function toLatestResponse(
  responses: ProofVersionRow["proof_responses"],
): ProofVersionView["latestResponse"] {
  if (responses.length === 0) return null;
  const latest = responses
    .slice()
    .sort((a, b) => new Date(b.responded_at).getTime() - new Date(a.responded_at).getTime())[0];
  return {
    response: latest.response,
    revisionComment: latest.revision_comment,
    respondedAt: latest.responded_at,
    respondedVia: latest.responded_via,
  };
}

export type ProofVersionView = {
  id: string;
  versionNumber: number;
  customerMessage: string | null;
  sentAt: string | null;
  signedUrl: string | null;
  fileName: string | null;
  latestResponse: {
    response: string;
    revisionComment: string | null;
    respondedAt: string;
    respondedVia: string;
  } | null;
};

export type ProofView = {
  id: string;
  title: string;
  approvalRequired: boolean;
  visibility: string;
  latestStatus: string;
  createdAt: string;
  versions: ProofVersionView[];
};

/** Resolves signed URLs server-side (short-lived, per-request — docs/security.md #5) so client components never touch storage paths directly. */
export async function buildProofViews(supabase: SupabaseClient, proofs: ProofRow[]): Promise<ProofView[]> {
  return Promise.all(
    proofs.map(async (proof) => {
      const versions = await Promise.all(
        proof.proof_versions
          .slice()
          .sort((a, b) => b.version_number - a.version_number)
          .map(async (v) => ({
            id: v.id,
            versionNumber: v.version_number,
            customerMessage: v.customer_message,
            sentAt: v.sent_at,
            signedUrl: v.file ? await getAttachmentSignedUrl(supabase, v.file.storage_path) : null,
            fileName: v.file?.file_name ?? null,
            latestResponse: toLatestResponse(v.proof_responses),
          })),
      );

      return {
        id: proof.id,
        title: proof.title,
        approvalRequired: proof.approval_required,
        visibility: proof.visibility,
        latestStatus: proof.latest_status,
        createdAt: proof.created_at,
        versions,
      };
    }),
  );
}
