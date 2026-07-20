"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/server/authz/session";
import { createRepairTicket, type CreateRepairTicketResult } from "@/server/domain/repairs/createRepairTicket";
import { updateRepairTicket, type UpdateRepairTicketResult } from "@/server/domain/repairs/updateRepairTicket";
import { changeRepairStatus } from "@/server/domain/repairs/changeRepairStatus";
import { recordRepairPayment } from "@/server/domain/repairs/recordRepairPayment";
import { addRepairDiagnostic } from "@/server/domain/repairs/addRepairDiagnostic";
import { setRepairApproval } from "@/server/domain/repairs/setRepairApproval";
import { recordRepairAttachment } from "@/server/domain/attachments/recordRepairAttachment";
import type { CreateRepairTicketInput, UpdateRepairTicketInput, AddRepairDiagnosticInput } from "@/lib/validation/repairs";
import type { RecordPaymentInput } from "@/lib/validation/payments";
import type { RecordAttachmentInput } from "@/lib/validation/attachments";

export async function createRepairTicketAction(
  input: CreateRepairTicketInput,
): Promise<CreateRepairTicketResult> {
  const ctx = await requireOrgContext();
  return createRepairTicket(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, input);
}

export async function updateRepairTicketAction(
  input: UpdateRepairTicketInput,
): Promise<UpdateRepairTicketResult> {
  const ctx = await requireOrgContext();
  const result = await updateRepairTicket(ctx.supabase, ctx.activeMembership.organization_id, input);
  revalidatePath(`/repairs/${input.repairTicketId}`);
  revalidatePath("/repairs");
  revalidatePath("/dashboard");
  return result;
}

export async function changeRepairStatusAction(repairTicketId: string, statusId: string) {
  const ctx = await requireOrgContext();
  const result = await changeRepairStatus(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    ctx.userId,
    repairTicketId,
    statusId,
  );
  revalidatePath(`/repairs/${repairTicketId}`);
  revalidatePath("/repairs");
  revalidatePath("/dashboard");
  return result;
}

export async function recordRepairPaymentAction(input: RecordPaymentInput, customerId: string) {
  const ctx = await requireOrgContext();
  const result = await recordRepairPayment(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    customerId,
    input,
  );
  if (input.repairTicketId) revalidatePath(`/repairs/${input.repairTicketId}`);
  revalidatePath("/dashboard");
  return result;
}

export async function addRepairDiagnosticAction(input: AddRepairDiagnosticInput) {
  const ctx = await requireOrgContext();
  const result = await addRepairDiagnostic(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    ctx.userId,
    input,
  );
  revalidatePath(`/repairs/${input.repairTicketId}`);
  return result;
}

export async function setRepairApprovalAction(repairTicketId: string, approved: boolean) {
  const ctx = await requireOrgContext();
  const result = await setRepairApproval(ctx.supabase, repairTicketId, approved);
  revalidatePath(`/repairs/${repairTicketId}`);
  revalidatePath("/dashboard");
  return result;
}

export async function recordRepairAttachmentAction(input: RecordAttachmentInput) {
  const ctx = await requireOrgContext();
  const result = await recordRepairAttachment(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    ctx.userId,
    input,
  );
  if (input.repairTicketId) revalidatePath(`/repairs/${input.repairTicketId}`);
  return result;
}
