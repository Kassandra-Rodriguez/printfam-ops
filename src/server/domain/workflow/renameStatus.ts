import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateStatusLabel } from "@/server/data/workflow";

export type RenameStatusResult = { ok: true } | { ok: false; error: string };

/** docs/user_roles.md: "Custom statuses/workflow config: Owner F only" — enforced by RLS (workflow_statuses_write_owner), not re-checked here. */
export async function renameStatus(
  supabase: SupabaseClient,
  statusId: string,
  label: string,
): Promise<RenameStatusResult> {
  const trimmed = label.trim();
  if (!trimmed) {
    return { ok: false, error: "Label can't be empty" };
  }

  try {
    await updateStatusLabel(supabase, statusId, trimmed);
    return { ok: true };
  } catch (err) {
    console.error("renameStatus failed:", err);
    return { ok: false, error: "Could not rename the status. Try again." };
  }
}
