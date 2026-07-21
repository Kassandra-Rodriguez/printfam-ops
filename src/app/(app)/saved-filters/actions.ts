"use server";

import { revalidatePath } from "next/cache";
import { requireOrgContext } from "@/server/authz/session";
import { createSavedFilter, deleteSavedFilter } from "@/server/data/savedFilters";

export async function createSavedFilterAction(
  entityType: string,
  name: string,
  filterParams: Record<string, string>,
  revalidatePathTarget: string,
) {
  const ctx = await requireOrgContext();
  await createSavedFilter(ctx.supabase, ctx.activeMembership.organization_id, ctx.userId, {
    entityType,
    name,
    filterParams,
  });
  revalidatePath(revalidatePathTarget);
}

export async function deleteSavedFilterAction(id: string, revalidatePathTarget: string) {
  const ctx = await requireOrgContext();
  await deleteSavedFilter(ctx.supabase, id);
  revalidatePath(revalidatePathTarget);
}
