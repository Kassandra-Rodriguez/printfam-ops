import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkflowStatuses, swapStatusSortOrder, type WorkflowEntityType } from "@/server/data/workflow";

export type MoveStatusResult = { ok: true } | { ok: false; error: string };

export async function moveStatus(
  supabase: SupabaseClient,
  organizationId: string,
  entityType: WorkflowEntityType,
  statusId: string,
  direction: "up" | "down",
): Promise<MoveStatusResult> {
  try {
    const statuses = await getWorkflowStatuses(supabase, organizationId, entityType);
    const index = statuses.findIndex((s) => s.id === statusId);
    if (index === -1) {
      return { ok: false, error: "Status not found" };
    }
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= statuses.length) {
      return { ok: false, error: "Already at the edge" };
    }

    await swapStatusSortOrder(supabase, statuses[index].id, statuses[neighborIndex].id);
    return { ok: true };
  } catch (err) {
    console.error("moveStatus failed:", err);
    return { ok: false, error: "Could not reorder the status. Try again." };
  }
}
