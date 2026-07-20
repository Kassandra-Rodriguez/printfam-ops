"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/server/authz/session";
import { createTask } from "@/server/domain/tasks/createTask";
import { setTaskStatus } from "@/server/data/tasks";
import type { CreateTaskInput } from "@/lib/validation/tasks";

export async function createTaskAction(input: CreateTaskInput) {
  const ctx = await requireOrgContext();
  const result = await createTask(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, input);
  revalidatePath("/tasks");
  if (input.orderId) revalidatePath(`/orders/${input.orderId}`);
  if (input.requestId) revalidatePath(`/requests/${input.requestId}`);
  if (input.repairTicketId) revalidatePath(`/repairs/${input.repairTicketId}`);
  revalidatePath("/dashboard");
  return result;
}

export async function completeTaskAction(taskId: string, orderId?: string) {
  const ctx = await requireOrgContext();
  await setTaskStatus(ctx.supabase, taskId, "completed");
  revalidatePath("/tasks");
  if (orderId) revalidatePath(`/orders/${orderId}`);
  revalidatePath("/dashboard");
}
