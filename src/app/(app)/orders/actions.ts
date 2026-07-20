"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/server/authz/session";
import { createOrder, type CreateOrderResult } from "@/server/domain/orders/createOrder";
import { changeOrderStatus } from "@/server/domain/orders/changeOrderStatus";
import { recordOrderPayment } from "@/server/domain/orders/recordOrderPayment";
import { recordOrderAttachment } from "@/server/domain/attachments/recordOrderAttachment";
import { updateOrder, type UpdateOrderResult } from "@/server/domain/orders/updateOrder";
import type { CreateOrderInput, UpdateOrderInput } from "@/lib/validation/orders";
import type { RecordPaymentInput } from "@/lib/validation/payments";
import type { RecordAttachmentInput } from "@/lib/validation/attachments";

export async function createOrderAction(input: CreateOrderInput): Promise<CreateOrderResult> {
  const ctx = await requireOrgContext();
  return createOrder(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, input);
}

export async function changeOrderStatusAction(orderId: string, statusId: string) {
  const ctx = await requireOrgContext();
  const result = await changeOrderStatus(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    ctx.userId,
    orderId,
    statusId,
  );
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return result;
}

export async function recordPaymentAction(input: RecordPaymentInput, customerId: string) {
  const ctx = await requireOrgContext();
  const result = await recordOrderPayment(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    customerId,
    input,
  );
  revalidatePath(`/orders/${input.orderId}`);
  revalidatePath("/dashboard");
  return result;
}

export async function updateOrderAction(input: UpdateOrderInput): Promise<UpdateOrderResult> {
  const ctx = await requireOrgContext();
  const result = await updateOrder(ctx.supabase, ctx.activeMembership.organization_id, input);
  revalidatePath(`/orders/${input.orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return result;
}

export async function recordOrderAttachmentAction(input: RecordAttachmentInput) {
  const ctx = await requireOrgContext();
  const result = await recordOrderAttachment(
    ctx.supabase,
    ctx.activeMembership.organization_id,
    ctx.userId,
    input,
  );
  revalidatePath(`/orders/${input.orderId}`);
  return result;
}
