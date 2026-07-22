"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/server/authz/session";
import { createQuote, type CreateQuoteResult } from "@/server/domain/quotes/createQuote";
import { updateQuote, type UpdateQuoteResult } from "@/server/domain/quotes/updateQuote";
import { changeQuoteStatus } from "@/server/domain/quotes/changeQuoteStatus";
import { sendQuote } from "@/server/domain/quotes/sendQuote";
import { recordQuoteResponse } from "@/server/domain/quotes/recordQuoteResponse";
import { recordQuotePayment } from "@/server/domain/quotes/recordQuotePayment";
import { recordQuoteAttachment } from "@/server/domain/attachments/recordQuoteAttachment";
import type { CreateQuoteInput, UpdateQuoteInput } from "@/lib/validation/quotes";
import type { RecordPaymentInput } from "@/lib/validation/payments";
import type { RecordAttachmentInput } from "@/lib/validation/attachments";

export async function createQuoteAction(input: CreateQuoteInput): Promise<CreateQuoteResult> {
  const ctx = await requireOrgContext();
  return createQuote(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, input);
}

export async function updateQuoteAction(input: UpdateQuoteInput): Promise<UpdateQuoteResult> {
  const ctx = await requireOrgContext();
  const result = await updateQuote(ctx.supabase, ctx.activeMembership.organization_id, input);
  revalidatePath(`/quotes/${input.quoteId}`);
  revalidatePath("/quotes");
  return result;
}

export async function changeQuoteStatusAction(quoteId: string, statusId: string) {
  const ctx = await requireOrgContext();
  const result = await changeQuoteStatus(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    ctx.userId,
    quoteId,
    statusId,
  );
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  return result;
}

export async function sendQuoteAction(quoteId: string, forceReissue: boolean = false) {
  const ctx = await requireOrgContext();
  const result = await sendQuote(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, quoteId, forceReissue);
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  return result;
}

export async function recordQuoteResponseAction(
  quoteId: string,
  response: "approved" | "declined",
  declineReason?: string,
) {
  const ctx = await requireOrgContext();
  const result = await recordQuoteResponse(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    quoteId,
    response,
    declineReason,
    { type: "user", userId: ctx.userId },
  );
  revalidatePath(`/quotes/${quoteId}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  return result;
}

export async function recordQuotePaymentAction(input: RecordPaymentInput, customerId: string) {
  const ctx = await requireOrgContext();
  const result = await recordQuotePayment(ctx.supabase, ctx.activeMembership.organization_id, customerId, input);
  if (input.quoteId) revalidatePath(`/quotes/${input.quoteId}`);
  revalidatePath("/dashboard");
  return result;
}

export async function recordQuoteAttachmentAction(input: RecordAttachmentInput) {
  const ctx = await requireOrgContext();
  const result = await recordQuoteAttachment(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    ctx.userId,
    input,
  );
  if (input.quoteId) revalidatePath(`/quotes/${input.quoteId}`);
  return result;
}
