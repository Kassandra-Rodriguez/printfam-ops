import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateEnabledModules, OPTIONAL_MODULES, type OptionalModule } from "@/server/data/organizations";

export type SetEnabledModulesResult = { ok: true } | { ok: false; error: string };

/** Owner-only — enforced by RLS (organizations_update_owner, 0002_tenancy.sql), not re-checked here. */
export async function setEnabledModules(
  supabase: SupabaseClient,
  organizationId: string,
  modules: string[],
): Promise<SetEnabledModulesResult> {
  const valid = modules.filter((m): m is OptionalModule => (OPTIONAL_MODULES as readonly string[]).includes(m));

  try {
    await updateEnabledModules(supabase, organizationId, valid);
    return { ok: true };
  } catch (err) {
    console.error("setEnabledModules failed:", err);
    return { ok: false, error: "Could not save module settings. Try again." };
  }
}
