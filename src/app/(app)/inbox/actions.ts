"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/server/authz/session";
import { logCommunication, type LogCommunicationResult } from "@/server/domain/communications/logCommunication";
import type { LogCommunicationInput } from "@/lib/validation/communications";

export async function logCommunicationAction(
  input: LogCommunicationInput,
): Promise<LogCommunicationResult> {
  const ctx = await requireOrgContext();
  const result = await logCommunication(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    ctx.userId,
    input,
  );
  revalidatePath("/inbox");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (input.relatedRequestId) revalidatePath(`/requests/${input.relatedRequestId}`);
  if (input.relatedOrderId) revalidatePath(`/orders/${input.relatedOrderId}`);
  if (input.relatedRepairTicketId) revalidatePath(`/repairs/${input.relatedRepairTicketId}`);
  return result;
}
