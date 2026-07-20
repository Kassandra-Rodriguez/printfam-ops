import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateRequestStatus } from "@/server/data/requests";

export async function changeRequestStatus(
  supabase: SupabaseClient,
  requestId: string,
  statusId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateRequestStatus(supabase, requestId, statusId);
    return { ok: true };
  } catch (err) {
    console.error("changeRequestStatus failed:", err);
    return { ok: false, error: "Could not update the status. Try again." };
  }
}
