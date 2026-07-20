import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addRepairDiagnosticSchema, type AddRepairDiagnosticInput } from "@/lib/validation/repairs";
import { insertRepairDiagnostic } from "@/server/data/repairs";

/** docs/user_flows.md Flow D step 2/4 — diagnostic notes and the testing checklist share this one append-only log. */
export async function addRepairDiagnostic(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: AddRepairDiagnosticInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = addRepairDiagnosticSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await insertRepairDiagnostic(supabase, organizationId, userId, parsed.data);
    return { ok: true };
  } catch (err) {
    console.error("addRepairDiagnostic failed:", err);
    return { ok: false, error: "Could not save the entry. Try again." };
  }
}
