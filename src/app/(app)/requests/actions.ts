"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/server/authz/session";
import { createRequest, type CreateRequestResult } from "@/server/domain/requests/createRequest";
import { changeRequestStatus } from "@/server/domain/requests/changeRequestStatus";
import type { CreateRequestInput } from "@/lib/validation/requests";

export async function createRequestAction(input: CreateRequestInput): Promise<CreateRequestResult> {
  const ctx = await requireOrgContext();
  return createRequest(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, input);
}

export async function changeRequestStatusAction(requestId: string, statusId: string) {
  const ctx = await requireOrgContext();
  const result = await changeRequestStatus(ctx.supabase, requestId, statusId);
  revalidatePath(`/requests/${requestId}`);
  revalidatePath("/requests");
  return result;
}
