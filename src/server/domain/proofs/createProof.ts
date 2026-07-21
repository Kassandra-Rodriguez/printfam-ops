import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createProofSchema, type CreateProofInput } from "@/lib/validation/proofs";

export type CreateProofResult = { status: "created"; proofId: string } | { status: "error"; error: string };

/** docs/user_flows.md Flow F step 1. */
export async function createProof(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: CreateProofInput,
): Promise<CreateProofResult> {
  const parsed = createProofSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  try {
    const { data: proof, error } = await supabase
      .from("proofs")
      .insert({
        organization_id: organizationId,
        order_id: data.orderId ?? null,
        repair_ticket_id: data.repairTicketId ?? null,
        title: data.title,
        approval_required: data.approvalRequired,
        visibility: data.visibility,
        latest_status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();

    if (error || !proof) {
      console.error("createProof: insert failed:", error);
      return { status: "error", error: "Could not create the proof. Try again." };
    }

    return { status: "created", proofId: proof.id };
  } catch (err) {
    console.error("createProof failed:", err);
    return { status: "error", error: "Could not create the proof. Try again." };
  }
}
