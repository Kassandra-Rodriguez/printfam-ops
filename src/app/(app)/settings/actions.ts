"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/server/authz/session";
import { renameStatus } from "@/server/domain/workflow/renameStatus";
import { moveStatus } from "@/server/domain/workflow/moveStatus";
import { setStatusInventoryTrigger } from "@/server/domain/workflow/setStatusInventoryTrigger";
import { setEnabledModules } from "@/server/domain/organizations/setEnabledModules";
import type { WorkflowEntityType } from "@/server/data/workflow";

export async function renameStatusAction(statusId: string, label: string) {
  const ctx = await requireOrgContext();
  const result = await renameStatus(ctx.supabase, statusId, label);
  revalidatePath("/settings");
  return result;
}

export async function moveStatusAction(entityType: WorkflowEntityType, statusId: string, direction: "up" | "down") {
  const ctx = await requireOrgContext();
  const result = await moveStatus(ctx.supabase, ctx.activeMembership.organization_id, entityType, statusId, direction);
  revalidatePath("/settings");
  return result;
}

export async function setStatusInventoryTriggerAction(statusId: string, trigger: "decrement" | "restock" | "none") {
  const ctx = await requireOrgContext();
  const result = await setStatusInventoryTrigger(ctx.supabase, statusId, trigger === "none" ? null : trigger);
  revalidatePath("/settings");
  return result;
}

export async function setEnabledModulesAction(modules: string[]) {
  const ctx = await requireOrgContext();
  const result = await setEnabledModules(ctx.supabase, ctx.activeMembership.organization_id, modules);
  revalidatePath("/", "layout");
  return result;
}
