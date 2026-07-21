import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateStatusInventoryTrigger } from "@/server/data/workflow";

export type SetStatusInventoryTriggerResult = { ok: true } | { ok: false; error: string };

export async function setStatusInventoryTrigger(
  supabase: SupabaseClient,
  statusId: string,
  inventoryTrigger: "decrement" | "restock" | null,
): Promise<SetStatusInventoryTriggerResult> {
  try {
    await updateStatusInventoryTrigger(supabase, statusId, inventoryTrigger);
    return { ok: true };
  } catch (err) {
    console.error("setStatusInventoryTrigger failed:", err);
    return { ok: false, error: "Could not update the inventory trigger. Try again." };
  }
}
