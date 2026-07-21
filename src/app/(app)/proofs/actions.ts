"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/server/authz/session";
import { createProof, type CreateProofResult } from "@/server/domain/proofs/createProof";
import { uploadProofVersion } from "@/server/domain/proofs/uploadProofVersion";
import { sendProof } from "@/server/domain/proofs/sendProof";
import { recordProofResponse } from "@/server/domain/proofs/recordProofResponse";
import type { CreateProofInput, UploadProofVersionInput } from "@/lib/validation/proofs";

function revalidateProofParent(orderId?: string, repairTicketId?: string) {
  if (orderId) revalidatePath(`/orders/${orderId}`);
  if (repairTicketId) revalidatePath(`/repairs/${repairTicketId}`);
}

export async function createProofAction(input: CreateProofInput): Promise<CreateProofResult> {
  const ctx = await requireOrgContext();
  const result = await createProof(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, input);
  revalidateProofParent(input.orderId, input.repairTicketId);
  return result;
}

export async function uploadProofVersionAction(
  input: UploadProofVersionInput,
  parent: { orderId?: string; repairTicketId?: string },
) {
  const ctx = await requireOrgContext();
  const result = await uploadProofVersion(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, input);
  revalidateProofParent(parent.orderId, parent.repairTicketId);
  return result;
}

export async function sendProofAction(proofId: string, parent: { orderId?: string; repairTicketId?: string }) {
  const ctx = await requireOrgContext();
  const result = await sendProof(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, proofId);
  revalidateProofParent(parent.orderId, parent.repairTicketId);
  return result;
}

export async function recordProofResponseAction(
  proofVersionId: string,
  response: "approved" | "revision_requested",
  revisionComment: string | undefined,
  parent: { orderId?: string; repairTicketId?: string },
) {
  const ctx = await requireOrgContext();
  const result = await recordProofResponse(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    proofVersionId,
    response,
    revisionComment,
    "staff_relayed",
  );
  revalidateProofParent(parent.orderId, parent.repairTicketId);
  revalidatePath("/dashboard");
  return result;
}
